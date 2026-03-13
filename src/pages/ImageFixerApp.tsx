import { BeforeAfterSlider } from '@/src/components/before-after-slider';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { Dropzone } from '@/src/components/dropzone';
import { ProcessingSteps } from '@/src/components/processing-steps';
import { Button } from '@/src/components/ui/button';
import { Slider } from '@/src/components/ui/slider';
import { useAuth } from '@/src/contexts/AuthContext';
import { analyzeImageFile, type AuditSnapshot } from '@/src/lib/auditor';
import {
  composeCompliantImage,
  type CompositorMetrics,
  type ShadowMode,
} from '@/src/lib/compositor';
import { hasProcessedMetadata, looksLikeOurOutput } from '@/src/lib/exif-metadata';
import { localInferenceClient } from '@/src/lib/local-inference-client';
import { cn } from '@/src/lib/utils';
import { smartWorkerClient } from '@/src/lib/worker-client';
import type { ProcessedPayload, WorkerProgress } from '@/src/workers/ai.worker';
import JSZip from 'jszip';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Download,
  ImagePlus,
  LoaderCircle,
  Package,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ItemStatus = 'queued' | 'processing' | 'completed' | 'error';
type AnalysisState = 'idle' | 'loading' | 'ready' | 'error';
type InferenceBackend = 'local-gpu' | 'browser-worker';
type LocalProbeState = 'checking' | 'connected' | 'unavailable' | 'error';

interface BatchItem {
  id: string;
  file: File;
  sourceUrl: string;
  status: ItemStatus;
  outputUrl: string | null;
  outputBlob: Blob | null;
  outputName: string | null;
  payload: ProcessedPayload | null;
  metrics: CompositorMetrics | null;
  renderKey: string | null;
  progressLogs: WorkerProgress[];
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  analysisSnapshot: AuditSnapshot | null;
  analysisState: AnalysisState;
  analysisError: string | null;
  inferenceBackend: InferenceBackend | null;
  forceProcess?: boolean;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MIN_DIMENSION = 500;
const MAX_PARALLEL_JOBS = 2;
const DEFAULT_SHADOW_INTENSITY = 55;

function App() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [shadowMode, setShadowMode] = useState<ShadowMode>('auto');
  const [shadowIntensity, setShadowIntensity] = useState(DEFAULT_SHADOW_INTENSITY);
  const [showAdvancedShadow, setShowAdvancedShadow] = useState(false);
  const [renderingShadow, setRenderingShadow] = useState(false);
  const [downloadingSelected, setDownloadingSelected] = useState(false);
  const [zipExporting, setZipExporting] = useState(false);
  const [localProbeState, setLocalProbeState] = useState<LocalProbeState>('checking');
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const preferLocalInference = localProbeState === 'connected';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const batchItemsRef = useRef<BatchItem[]>([]);
  const cancelledItemIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    batchItemsRef.current = batchItems;
  }, [batchItems]);

  useEffect(() => {
    let cancelled = false;
    setLocalProbeState('checking');

    void (async () => {
      try {
        const probe = await localInferenceClient.probe();
        if (cancelled) return;
        if (probe.available) {
          setLocalProbeState('connected');
          return;
        }
        setLocalProbeState('unavailable');
        console.warn(probe.reason ?? 'Local service is not reachable.');
      } catch (error) {
        if (cancelled) return;
        setLocalProbeState('error');
        console.warn((error as Error).message ?? 'Unable to probe local inference service.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeItem = useMemo(() => {
    if (!activeItemId) return batchItems[0] ?? null;
    return batchItems.find((item) => item.id === activeItemId) ?? batchItems[0] ?? null;
  }, [activeItemId, batchItems]);
  const staticAnalysisRows = useMemo(
    () => buildStaticAnalysisRows(activeItem?.analysisSnapshot ?? null),
    [activeItem?.analysisSnapshot],
  );
  const staticAnalysisPassCount = useMemo(
    () => staticAnalysisRows.filter((row) => row.status === 'pass').length,
    [staticAnalysisRows],
  );

  const processingCount = useMemo(
    () => batchItems.filter((item) => item.status === 'processing').length,
    [batchItems],
  );
  const completedItems = useMemo(
    () => batchItems.filter((item) => item.status === 'completed' && item.outputBlob),
    [batchItems],
  );

  useEffect(() => {
    if (!batchItems.length) {
      setActiveItemId(null);
      return;
    }

    const hasActive = !!activeItemId && batchItems.some((item) => item.id === activeItemId);
    if (!hasActive) {
      setActiveItemId(batchItems[0].id);
    }
  }, [activeItemId, batchItems]);

  useEffect(
    () => () => {
      batchItemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.sourceUrl);
        if (item.outputUrl) {
          URL.revokeObjectURL(item.outputUrl);
        }
      });
    },
    [],
  );

  const updateBatchItem = useCallback((itemId: string, updater: (item: BatchItem) => BatchItem) => {
    setBatchItems((previous) => previous.map((item) => (item.id === itemId ? updater(item) : item)));
  }, []);

  const applyComposedResult = useCallback(
    (
      itemId: string,
      payload: ProcessedPayload,
      result: Awaited<ReturnType<typeof composeCompliantImage>>,
      renderKey: string,
      inferenceBackend: InferenceBackend,
    ) => {
      const previousItem = batchItemsRef.current.find((item) => item.id === itemId);
      if (previousItem?.outputUrl) {
        URL.revokeObjectURL(previousItem.outputUrl);
      }

      const outputUrl = URL.createObjectURL(result.blob);
      setBatchItems((previous) =>
        previous.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'completed',
                payload,
                outputUrl,
                outputBlob: result.blob,
                outputName: result.outputFileName,
                metrics: result.metrics,
                renderKey,
                inferenceBackend,
                error: null,
                completedAt: Date.now(),
              }
            : item,
        ),
      );
    },
    [],
  );

  const runAudit = useCallback((itemId: string, file: File) => {
    void (async () => {
      updateBatchItem(itemId, (item) => ({ ...item, analysisState: 'loading', analysisError: null }));

      let sourceUrl: string | null = null;
      let overlayUrl: string | null = null;

      try {
        const audit = await analyzeImageFile(file);
        sourceUrl = audit.sourceUrl;
        overlayUrl = audit.overlayUrl;

        updateBatchItem(itemId, (item) => ({
          ...item,
          analysisState: 'ready',
          analysisSnapshot: audit.snapshot,
          analysisError: null,
        }));
      } catch (error) {
        updateBatchItem(itemId, (item) => ({
          ...item,
          analysisState: 'error',
          analysisError: (error as Error).message ?? 'Could not run pre-check.',
        }));
      } finally {
        if (sourceUrl) URL.revokeObjectURL(sourceUrl);
        if (overlayUrl) URL.revokeObjectURL(overlayUrl);
      }
    })();
  }, [updateBatchItem]);

  const processBatchItem = useCallback(
    async (itemId: string) => {
      const item = batchItemsRef.current.find((entry) => entry.id === itemId);
      if (!item || item.status !== 'queued') return;

      updateBatchItem(itemId, (entry) => ({
        ...entry,
        status: 'processing',
        startedAt: Date.now(),
        completedAt: null,
        error: null,
        progressLogs: [],
      }));

      try {
        let precheckSnapshot = item.analysisSnapshot;
        if (!precheckSnapshot) {
          updateBatchItem(itemId, (entry) =>
            entry.analysisState === 'ready'
              ? entry
              : { ...entry, analysisState: 'loading', analysisError: null },
          );
          try {
            const audit = await analyzeImageFile(item.file);
            precheckSnapshot = audit.snapshot;
            URL.revokeObjectURL(audit.sourceUrl);
            URL.revokeObjectURL(audit.overlayUrl);
            updateBatchItem(itemId, (entry) => ({
              ...entry,
              analysisState: 'ready',
              analysisSnapshot: audit.snapshot,
              analysisError: null,
            }));
          } catch {
            // Non-blocking. Processing can continue even if audit probe fails.
          }
        }

        const shouldSkip = await shouldSkipProcessing(item.file, precheckSnapshot, item.forceProcess ?? false);
        if (shouldSkip) {
          const previousItem = batchItemsRef.current.find((entry) => entry.id === itemId);
          if (previousItem?.outputUrl) {
            URL.revokeObjectURL(previousItem.outputUrl);
          }

          const outputBlob = item.file.slice(0, item.file.size, item.file.type || 'image/jpeg');
          const outputUrl = URL.createObjectURL(outputBlob);

          updateBatchItem(itemId, (entry) => ({
            ...entry,
            status: 'completed',
            outputUrl,
            outputBlob,
            outputName: item.file.name,
            payload: null,
            metrics: buildAlreadyCompliantMetrics(precheckSnapshot),
            renderKey: null,
            inferenceBackend: null,
            progressLogs: [
              {
                id: crypto.randomUUID(),
                type: 'progress',
                stage: 'packaging',
                message: 'Upload passed all compliance checks. Skipping extra processing.',
              },
            ],
            error: null,
            completedAt: Date.now(),
          }));
          return;
        }

        const pushProgress = (entry: WorkerProgress) => {
          updateBatchItem(itemId, (row) => ({
            ...row,
            progressLogs: [...row.progressLogs.filter((log) => log.stage !== entry.stage), entry],
          }));
        };

        let payload: ProcessedPayload | null = null;
        let inferenceBackend: InferenceBackend = 'browser-worker';

        if (preferLocalInference && localProbeState === 'connected') {
          try {
            payload = await localInferenceClient.process(item.file, { onProgress: pushProgress });
            inferenceBackend = 'local-gpu';
          } catch (error) {
            console.warn('fix.pictures: local inference failed, falling back to browser worker', error);
            pushProgress({
              id: crypto.randomUUID(),
              type: 'progress',
              stage: 'loading',
              message: 'Local service unavailable, falling back to browser runtime',
            });
          }
        }

        if (!payload) {
          payload = await smartWorkerClient.process(item.file, {
            onProgress: pushProgress,
          });
          inferenceBackend = 'browser-worker';
        }

        updateBatchItem(itemId, (entry) => ({
          ...entry,
          progressLogs: [
            ...entry.progressLogs.filter((log) => log.stage !== 'packaging'),
            {
              id: crypto.randomUUID(),
              type: 'progress',
              stage: 'packaging',
              message: 'Building 2000px compliance canvas',
            },
          ],
          inferenceBackend,
        }));

        const renderKey = `${shadowMode}:${shadowIntensity}`;
        const result = await composeCompliantImage(payload, {
          shadowMode,
          shadowIntensity,
          quality: 0.9,
          wasEdgeEnhanced: payload.wasEdgeEnhanced,
        });
        applyComposedResult(itemId, payload, result, renderKey, inferenceBackend);
      } catch (error) {
        const err = error as Error;

        if (err.name === 'AbortError') {
          const wasCancelled = cancelledItemIdsRef.current.has(itemId);
          if (wasCancelled) {
            cancelledItemIdsRef.current.delete(itemId);
          }
          updateBatchItem(itemId, (entry) => ({
            ...entry,
            status: wasCancelled ? 'error' : 'queued',
            progressLogs: [],
            error: wasCancelled ? 'Processing cancelled by user.' : null,
            startedAt: null,
            completedAt: null,
            inferenceBackend: null,
          }));
          return;
        }

        updateBatchItem(itemId, (entry) => ({
          ...entry,
          status: 'error',
          error: err.message ?? 'Processing failed.',
          completedAt: Date.now(),
        }));
      }
    },
    [applyComposedResult, localProbeState, preferLocalInference, shadowIntensity, shadowMode, updateBatchItem],
  );

  useEffect(() => {
    if (!batchItems.length) return;

    const availableSlots = Math.max(MAX_PARALLEL_JOBS - processingCount, 0);
    if (availableSlots <= 0) return;

    const nextItems = batchItems.filter((item) => item.status === 'queued').slice(0, availableSlots);
    nextItems.forEach((item) => {
      void processBatchItem(item.id);
    });
  }, [batchItems, processingCount, processBatchItem]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    const validation = await Promise.all(
      files.map(async (file) => {
        const reason = await validateFile(file);
        return { file, reason };
      }),
    );

    const errors = validation
      .filter((entry) => entry.reason)
      .map((entry) => `${entry.file.name}: ${entry.reason}`);

    if (errors.length) {
      setSessionError(errors.join(' | '));
    } else {
      setSessionError(null);
    }

    const validFiles = validation.filter((entry) => !entry.reason).map((entry) => entry.file);
    if (!validFiles.length) return;

    const assessedItems = await Promise.all(
      validFiles.map(async (file): Promise<BatchItem> => {
        let snapshot: AuditSnapshot | null = null;
        let analysisState: AnalysisState = 'idle';
        let analysisError: string | null = null;

        try {
          const audit = await analyzeImageFile(file);
          snapshot = audit.snapshot;
          analysisState = 'ready';
          URL.revokeObjectURL(audit.sourceUrl);
          URL.revokeObjectURL(audit.overlayUrl);
        } catch (error) {
          analysisState = 'error';
          analysisError = (error as Error).message ?? 'Could not run pre-check.';
        }

        const alreadyCompliant = await shouldSkipProcessing(file, snapshot, false);
        const sourceUrl = URL.createObjectURL(file);
        const outputBlob = alreadyCompliant ? file.slice(0, file.size, file.type || 'image/jpeg') : null;
        const outputUrl = outputBlob ? URL.createObjectURL(outputBlob) : null;

        return {
          id: crypto.randomUUID(),
          file,
          sourceUrl,
          status: alreadyCompliant ? 'completed' : 'queued',
          outputUrl,
          outputBlob,
          outputName: outputBlob ? file.name : null,
          payload: null,
          metrics: alreadyCompliant ? buildAlreadyCompliantMetrics(snapshot) : null,
          renderKey: null,
          progressLogs: alreadyCompliant
            ? [
                {
                  id: crypto.randomUUID(),
                  type: 'progress',
                  stage: 'packaging',
                  message: 'Upload passed all compliance checks. Skipped processing.',
                },
              ]
            : [],
          error: null,
          startedAt: null,
          completedAt: alreadyCompliant ? Date.now() : null,
          analysisSnapshot: snapshot,
          analysisState,
          analysisError,
          inferenceBackend: null,
        };
      }),
    );

    setBatchItems((previous) => [...previous, ...assessedItems]);
    setActiveItemId((current) => current ?? assessedItems[0]?.id ?? null);

    assessedItems
      .filter((item) => item.status === 'queued' && item.analysisState !== 'ready')
      .forEach((item) => runAudit(item.id, item.file));
  }, [runAudit]);

  const clearSession = useCallback(() => {
    batchItemsRef.current.forEach((item) => {
      URL.revokeObjectURL(item.sourceUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    });

    setBatchItems([]);
    setActiveItemId(null);
    setSessionError(null);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    const item = batchItemsRef.current.find((entry) => entry.id === itemId);
    if (item) {
      URL.revokeObjectURL(item.sourceUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    }

    setBatchItems((previous) => previous.filter((entry) => entry.id !== itemId));
  }, []);

  const retryItem = useCallback((itemId: string) => {
    updateBatchItem(itemId, (item) => ({
      ...item,
      status: 'queued',
      error: null,
      startedAt: null,
      completedAt: null,
      progressLogs: [],
      inferenceBackend: null,
    }));
  }, [updateBatchItem]);
 
  const forceProcessItem = useCallback((itemId: string) => {
    updateBatchItem(itemId, (item) => ({
      ...item,
      status: 'queued',
      forceProcess: true,
      error: null,
      startedAt: null,
      completedAt: null,
      progressLogs: [],
      outputUrl: null,
      outputBlob: null,
      outputName: null,
      payload: null,
      metrics: null,
      renderKey: null,
      inferenceBackend: null,
    }));
  }, [updateBatchItem]);


  const cancelProcessing = useCallback(() => {
    const processingIds = batchItemsRef.current
      .filter((item) => item.status === 'processing')
      .map((item) => item.id);
    cancelledItemIdsRef.current = new Set(processingIds);
    smartWorkerClient.cancelCurrent();
  }, []);

  const getCurrentRenderKey = useCallback(() => `${shadowMode}:${shadowIntensity}`, [shadowIntensity, shadowMode]);

  const ensureLatestExport = useCallback(
    async (item: BatchItem | null) => {
      if (!item || item.status !== 'completed') return null;

      if (!item.payload) {
        if (!item.outputBlob) return null;
        return {
          blob: item.outputBlob,
          fileName: item.outputName ?? fallbackOutputName(item.file.name),
        };
      }

      const expectedRenderKey = getCurrentRenderKey();
      const fileName = item.outputName ?? fallbackOutputName(item.file.name);
      if (item.renderKey === expectedRenderKey && item.outputBlob) {
        return { blob: item.outputBlob, fileName };
      }

      const result = await composeCompliantImage(item.payload, {
        shadowMode,
        shadowIntensity,
        quality: 0.9,
      });
      applyComposedResult(
        item.id,
        item.payload,
        result,
        expectedRenderKey,
        item.inferenceBackend ?? 'browser-worker',
      );
      return { blob: result.blob, fileName: result.outputFileName };
    },
    [applyComposedResult, getCurrentRenderKey, shadowIntensity, shadowMode],
  );

  const downloadSelected = useCallback(() => {
    if (!activeItem || downloadingSelected) return;

    void (async () => {
      setDownloadingSelected(true);
      try {
        const latestItem = batchItemsRef.current.find((entry) => entry.id === activeItem.id) ?? activeItem;
        const exportAsset = await ensureLatestExport(latestItem);
        if (!exportAsset) return;
        const url = URL.createObjectURL(exportAsset.blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = exportAsset.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        setSessionError((error as Error).message ?? 'Could not prepare latest export.');
      } finally {
        setDownloadingSelected(false);
      }
    })();
  }, [activeItem, downloadingSelected, ensureLatestExport]);

  const downloadItem = useCallback((itemId: string) => {
    void (async () => {
      try {
        const item = batchItemsRef.current.find((entry) => entry.id === itemId) ?? null;
        const exportAsset = await ensureLatestExport(item);
        if (!exportAsset) return;
        const url = URL.createObjectURL(exportAsset.blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = exportAsset.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        setSessionError((error as Error).message ?? 'Could not prepare latest export.');
      }
    })();
  }, [ensureLatestExport]);

  const downloadBatchZip = useCallback(async () => {
    if (!completedItems.length || zipExporting) return;

    setZipExporting(true);
    try {
      const zip = new JSZip();
      const snapshot = batchItemsRef.current.filter((item) => item.status === 'completed');
      for (const item of snapshot) {
        const exportAsset = await ensureLatestExport(item);
        if (!exportAsset) continue;
        zip.file(exportAsset.fileName, exportAsset.blob, { binary: true });
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `fix-pictures-batch-${new Date().toISOString().slice(0, 10)}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipExporting(false);
    }
  }, [completedItems.length, ensureLatestExport, zipExporting]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
      const file = imageItem?.getAsFile();
      if (!file) return;

      event.preventDefault();
      void handleFiles([file]);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFiles]);

  useEffect(() => {
    if (!activeItem || activeItem.status !== 'completed' || !activeItem.payload) return;

    const renderKey = `${shadowMode}:${shadowIntensity}`;
    if (activeItem.renderKey === renderKey) return;
    const payload = activeItem.payload;

    let cancelled = false;
    setRenderingShadow(true);

    void (async () => {
      try {
        const result = await composeCompliantImage(payload, {
          shadowMode,
          shadowIntensity,
          quality: 0.9,
          wasEdgeEnhanced: payload.wasEdgeEnhanced,
        });

        if (cancelled) return;
        applyComposedResult(activeItem.id, payload, result, renderKey, activeItem.inferenceBackend ?? 'browser-worker');
      } catch (error) {
        if (cancelled) return;
        setSessionError((error as Error).message ?? 'Could not update shadow rendering.');
      } finally {
        if (!cancelled) {
          setRenderingShadow(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeItem, applyComposedResult, shadowIntensity, shadowMode]);

  return (
    <div className="relative h-screen overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
        <header className="shrink-0 rounded-2xl border border-zinc-200 bg-white/90 px-3 py-3 shadow-[0_16px_52px_-42px_rgba(15,23,42,0.5)] backdrop-blur sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white shadow-sm">
                <img src="/logo.png" alt="fix.pictures icon" className="h-7 w-7 rounded-lg object-cover" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">fix.pictures</p>
                <p className="truncate text-sm font-medium text-zinc-800">Amazon Image Compliance Engine</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-zinc-700">
              <MetricPill label="Queue" value={String(batchItems.length)} />
              <MetricPill label="Completed" value={String(completedItems.length)} accent />
              <MetricPill label="Processing" value={String(processingCount)} />
                <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignOutDialog(true)}
                className="ml-2 h-8 border-zinc-300 px-3 text-xs"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[340px,1fr]">
          <aside className="min-h-0">
            <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_16px_52px_-42px_rgba(15,23,42,0.5)] sm:p-4 lg:sticky lg:top-0 lg:h-full lg:overflow-y-auto">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight text-zinc-950">Upload</h2>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                  Batch
                </span>
              </div>

              <Dropzone onFiles={handleFiles} multiple />
              {sessionError && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {sessionError}
                </p>
              )}

              <div className="mt-3 grid gap-2">
                <Button variant="outline" className="h-10 justify-start border-zinc-300" onClick={clearSession} disabled={!batchItems.length}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear session
                </Button>
                <Button variant="outline" className="h-10 justify-start border-zinc-300" onClick={cancelProcessing} disabled={!processingCount}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Cancel processing
                </Button>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-sm font-semibold text-emerald-900">Selected Image Result</p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  {activeItem?.file.name ?? 'No image selected'}
                </p>

                <div className="mt-3 space-y-1.5">
                  {!activeItem ? (
                    <div className="rounded-xl border border-dashed border-emerald-300 bg-white/80 px-3 py-2 text-xs text-emerald-700">
                      Upload an image to see result stats.
                    </div>
                  ) : !activeItem.metrics ? (
                    <>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                          Static Analysis
                        </p>
                        {staticAnalysisRows.length > 0 ? (
                          <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {staticAnalysisPassCount}/{staticAnalysisRows.length}
                          </span>
                        ) : null}
                      </div>

                      {activeItem.analysisState === 'loading' ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/90 px-3 py-2 text-xs text-emerald-700">
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          Analyzing image compliance...
                        </div>
                      ) : activeItem.analysisState === 'error' ? (
                        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs text-rose-800">
                          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <p>{activeItem.analysisError ?? 'Static analysis failed.'}</p>
                        </div>
                      ) : staticAnalysisRows.length > 0 ? (
                        <div className="space-y-1.5">
                          {staticAnalysisRows.map((row) => (
                            <StaticAnalysisBox
                              key={row.id}
                              label={row.label}
                              value={row.value}
                              detail={row.detail}
                              status={row.status}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/90 px-3 py-2 text-xs text-emerald-700">
                          <Sparkles className="h-3.5 w-3.5" />
                          Preparing static analysis...
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid gap-1.5">
                        <ResultStatBox label="Pure white canvas" value={activeItem.metrics.backgroundHex} />
                        <ResultStatBox label="Output resolution" value={`${activeItem.metrics.resolution}px`} />
                        <ResultStatBox label="Product scale" value={`${(activeItem.metrics.scaleRatio * 100).toFixed(1)}%`} />
                        <ResultStatBox
                          label="Contact shadow"
                          value={activeItem.metrics.shadowApplied ? `${Math.round(activeItem.metrics.shadowOpacity * 100)}% opacity` : 'Off'}
                        />
                      </div>

                      {activeItem.metrics.compliance.notices.length ? (
                        <div className="mt-2 space-y-1.5">
                          {activeItem.metrics.compliance.notices.map((notice, index) => (
                            <div
                              key={`${notice}-${index}`}
                              className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-100/70 px-3 py-2 text-xs text-emerald-900"
                            >
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                              <p>{notice}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <main className="min-h-0 space-y-3 overflow-hidden lg:pr-1">
            {batchItems.length === 0 ? (
              <section className="grid min-h-[340px] place-items-center rounded-2xl border border-zinc-200 bg-white/80 p-8 shadow-[0_16px_52px_-42px_rgba(15,23,42,0.5)]">
                <div className="max-w-md text-center">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Workspace Ready</h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Add one or more product images from the left panel to start processing.
                  </p>
                </div>
              </section>
            ) : (
              <section className="grid h-full min-h-0 gap-3 xl:grid-cols-[1.45fr,1fr] xl:items-stretch">
                <article className="relative isolate h-full min-h-0 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_16px_52px_-42px_rgba(15,23,42,0.5)] sm:p-5">
            <div className="sticky top-0 z-50 -mx-4 -mt-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-white px-4 py-3 sm:-mx-5 sm:-mt-5 sm:px-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Selected Image</h2>
                <p className="text-sm text-zinc-600">
                  {activeItem?.file.name ?? 'No image selected'}
                </p>
              </div>
              <StatusBadge status={activeItem?.status ?? 'queued'} />
            </div>

            {activeItem?.outputUrl ? (
              <BeforeAfterSlider beforeSrc={activeItem.sourceUrl} afterSrc={activeItem.outputUrl} />
            ) : (
              <div className="aspect-square rounded-2xl border border-dashed border-zinc-300 bg-zinc-50">
                {activeItem?.status === 'processing' ? (
                  <div className="flex h-full flex-col p-4 sm:p-5">
                    <ProcessingSteps logs={activeItem.progressLogs} />
                  </div>
                ) : (
                  <div className="grid h-full place-items-center px-4 text-center text-zinc-600">
                    <ImagePlus className="mx-auto h-6 w-6" />
                    <p className="mt-2 text-sm">Result preview will appear here.</p>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-700"
              onClick={() => setShowAdvancedShadow((value) => !value)}
            >
              Advanced shadow controls
              {showAdvancedShadow ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvancedShadow && (
              <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Shadow mode</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className={cn('h-9 rounded-full px-4', shadowMode === 'auto' ? '' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200')}
                    onClick={() => setShadowMode('auto')}
                  >
                    Auto
                  </Button>
                  <Button
                    size="sm"
                    className={cn('h-9 rounded-full px-4', shadowMode === 'off' ? '' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200')}
                    onClick={() => setShadowMode('off')}
                  >
                    Off
                  </Button>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-zinc-700">
                    <span>Intensity</span>
                    <span>{shadowIntensity}%</span>
                  </div>
                  <Slider
                    value={[shadowIntensity]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => setShadowIntensity(value[0] ?? DEFAULT_SHADOW_INTENSITY)}
                    disabled={shadowMode === 'off'}
                  />
                </div>
                {renderingShadow && (
                  <p className="mt-3 text-xs text-zinc-600">
                    Re-rendering with updated shadow...
                  </p>
                )}
              </div>
            )}
 
            {activeItem?.status === 'completed' && !activeItem.payload && (
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                  onClick={() => forceProcessItem(activeItem.id)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Force Process This Image
                </Button>
                <p className="mt-2 text-xs text-amber-700">
                  Bypass all skip gates and reprocess this image, even if already compliant.
                </p>
              </div>
            )}
 
          </article>

                <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_16px_52px_-42px_rgba(15,23,42,0.5)] sm:p-5">
            <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between gap-2 border-b border-zinc-100 bg-white/95 px-4 pb-3 pt-1 backdrop-blur sm:-mx-5 sm:px-5">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Batch Queue</h2>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {batchItems.length} total
              </span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {batchItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveItemId(item.id)}
                  className={cn(
                    'w-full cursor-pointer rounded-2xl border border-zinc-200 bg-zinc-50 p-2 text-left transition hover:border-zinc-300 hover:bg-zinc-100',
                    activeItem?.id === item.id && 'border-emerald-300 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100',
                  )}
                >
                  <div className="flex gap-3">
                    <img src={item.sourceUrl} alt={item.file.name} className="h-14 w-14 rounded-xl border border-zinc-200 bg-white object-contain" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-zinc-900">{item.file.name}</p>
                        <StatusBadge status={item.status} compact />
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                        {item.completedAt && item.startedAt ? ` • ${Math.max(1, Math.round((item.completedAt - item.startedAt) / 1000))}s` : ''}
                      </p>
                      {item.error && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
                      {item.analysisState === 'error' && item.analysisError && (
                        <p className="mt-1 text-xs text-amber-700">{item.analysisError}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-zinc-300 px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          retryItem(item.id);
                        }}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Retry
                      </Button>
                    )}
                    {item.status === 'completed' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-zinc-300 px-3"
                          onClick={(event) => {
                            event.stopPropagation();
                            downloadItem(item.id);
                          }}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Download
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-zinc-300 px-3"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeItem(item.id);
                      }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 z-20 -mx-4 mt-3 border-t border-zinc-100 bg-white/95 px-4 pt-3 backdrop-blur sm:-mx-5 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={downloadSelected}
                  disabled={!activeItem || activeItem.status !== 'completed' || downloadingSelected || zipExporting}
                  className="h-11 flex-1 min-w-[180px] px-5 text-sm font-semibold"
                >
                  {downloadingSelected ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Preparing latest...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download selected
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 flex-1 min-w-[180px] border-zinc-300 px-5"
                  onClick={downloadBatchZip}
                  disabled={!completedItems.length || zipExporting}
                >
                  {zipExporting ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Building ZIP...
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-4 w-4" />
                      Download All ZIP ({completedItems.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
                </aside>
              </section>
            )}
          </main>
        </div>

        <div
          className="fixed inset-0 -z-10"
          style={{
            background:
              'radial-gradient(1000px 560px at 15% -180px, rgba(34,197,94,0.11), transparent 68%), radial-gradient(900px 480px at 86% 5%, rgba(16,185,129,0.08), transparent 72%), linear-gradient(180deg, #f8fafc 0%, #ffffff 36%, #ffffff 100%)',
          }}
        />
      </div>

      <ConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        title="Sign Out"
        description="Are you sure you want to sign out? You'll need to sign in again to access the app."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleSignOut}
        variant="destructive"
      />
    </div>
  );
}

const StatusBadge = ({ status, compact = false }: { status: ItemStatus; compact?: boolean }) => {
  const styles: Record<ItemStatus, string> = {
    queued: 'border-zinc-300 bg-zinc-100 text-zinc-700',
    processing: 'border-blue-200 bg-blue-50 text-blue-700',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-red-200 bg-red-50 text-red-700',
  };

  const icon = {
    queued: <Sparkles className="h-3.5 w-3.5" />,
    processing: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />,
    completed: <CheckCircle2 className="h-3.5 w-3.5" />,
    error: <CircleAlert className="h-3.5 w-3.5" />,
  }[status];

  const label = {
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    error: 'Error',
  }[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        styles[status],
        compact && 'px-2 py-0.5 text-[11px]',
      )}
    >
      {icon}
      {label}
    </span>
  );
};

const ResultStatBox = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100/70 px-3 py-2 text-sm text-emerald-900">
    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
    <span className="text-emerald-800">{label}:</span>
    <span className="ml-auto font-semibold text-emerald-950">{value}</span>
  </div>
);

type StaticAnalysisRow = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: 'pass' | 'warn' | 'fail';
};

const StaticAnalysisBox = ({
  label,
  value,
  detail,
  status,
}: Omit<StaticAnalysisRow, 'id'>) => (
  <div
    className={cn(
      'rounded-xl border px-3 py-2',
      status === 'pass'
        ? 'border-emerald-200 bg-emerald-100/70 text-emerald-900'
        : status === 'warn'
          ? 'border-amber-200 bg-amber-50/80 text-amber-900'
          : 'border-rose-200 bg-rose-50/80 text-rose-900',
    )}
  >
    <div className="flex items-center gap-2">
      {status === 'pass' ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
      ) : (
        <CircleAlert className={cn('h-3.5 w-3.5 shrink-0', status === 'warn' ? 'text-amber-700' : 'text-rose-700')} />
      )}
      <p className="text-sm font-medium">{label}</p>
      <span className="ml-auto text-xs font-semibold">{value}</span>
    </div>
    <p className={cn('mt-1 text-xs', status === 'pass' ? 'text-emerald-800' : status === 'warn' ? 'text-amber-800' : 'text-rose-800')}>
      {detail}
    </p>
  </div>
);

const MetricPill = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 rounded-full border px-3 py-1.5 text-xs',
      accent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-700',
    )}
  >
    <span className="uppercase tracking-[0.12em]">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const validateFile = async (file: File) => {
  const type = file.type.toLowerCase();
  if (!ALLOWED_TYPES.has(type)) {
    return 'Unsupported format (use JPG, PNG, or WEBP).';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File is larger than 25MB.';
  }

  try {
    const { width, height } = await readImageDimensions(file);
    if (Math.min(width, height) < MIN_DIMENSION) {
      return `Image is too small (${width}x${height}); minimum is 500px.`;
    }
  } catch (error) {
    return (error as Error).message ?? 'Could not read image dimensions.';
  }

  return null;
};

const readImageDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image file could not be decoded.'));
    };

    image.src = url;
  });

const fallbackOutputName = (inputName: string) => {
  const dotIndex = inputName.lastIndexOf('.');
  const base = dotIndex > 0 ? inputName.slice(0, dotIndex) : inputName;
  return `${base || 'image'}-fix.jpg`;
};

const buildStaticAnalysisRows = (snapshot: AuditSnapshot | null): StaticAnalysisRow[] => {
  if (!snapshot) return [];

  const checkById = (id: AuditSnapshot['checks'][number]['id']) =>
    snapshot.checks.find((check) => check.id === id) ?? null;
  const productFill = checkById('product-fill');
  const dimensions = checkById('dimensions');
  const fileFormat = checkById('file-format');
  const fileSize = checkById('file-size');

  const offWhitePct = snapshot.nonWhiteBackgroundRatio * 100;
  const bgStatus: StaticAnalysisRow['status'] = offWhitePct <= 1 ? 'pass' : offWhitePct <= 20 ? 'warn' : 'fail';

  const edgePaddingPass = snapshot.minPaddingRatio >= 0.005;
  const edgePaddingPct = (snapshot.minPaddingRatio * 100).toFixed(2);

  return [
    {
      id: 'white-background',
      label: 'Pure White Background',
      value: bgStatus === 'pass' ? 'PASS' : bgStatus === 'warn' ? 'WARN' : 'FAIL',
      detail:
        bgStatus === 'pass'
          ? `${offWhitePct.toFixed(2)}% off-white background detected.`
          : `${offWhitePct.toFixed(2)}% near-white background in source.`,
      status: bgStatus,
    },
    {
      id: 'product-fill',
      label: 'Product Fill (85%+)',
      value: productFill?.pass ? 'PASS' : 'FAIL',
      detail: productFill?.detail ?? 'Product fill check unavailable.',
      status: productFill?.pass ? 'pass' : 'fail',
    },
    {
      id: 'edge-bleed',
      label: 'No Edge Bleed',
      value: edgePaddingPass ? 'PASS' : 'FAIL',
      detail: `Minimum border clearance is ${edgePaddingPct}% (target: >=0.50%).`,
      status: edgePaddingPass ? 'pass' : 'fail',
    },
    {
      id: 'dimensions',
      label: 'Image Dimensions',
      value: dimensions?.pass ? 'PASS' : 'FAIL',
      detail: dimensions?.detail ?? 'Dimension check unavailable.',
      status: dimensions?.pass ? 'pass' : 'fail',
    },
    {
      id: 'file-format',
      label: 'Accepted Format',
      value: fileFormat?.pass ? 'PASS' : 'FAIL',
      detail: fileFormat?.detail ?? 'Format check unavailable.',
      status: fileFormat?.pass ? 'pass' : 'fail',
    },
    {
      id: 'file-size',
      label: 'File Size Limit',
      value: fileSize?.pass ? 'PASS' : 'FAIL',
      detail: fileSize?.detail ?? 'File size check unavailable.',
      status: fileSize?.pass ? 'pass' : 'fail',
    },
  ];
};

const buildAlreadyCompliantMetrics = (snapshot: AuditSnapshot | null): CompositorMetrics => {
  const scaleRatio = Math.max(0, Math.min(1, snapshot?.coverageRatio ?? 0.85));
  const resolution = Math.max(snapshot?.width ?? 2000, snapshot?.height ?? 2000);

  return {
    scaleRatio,
    resolution,
    backgroundHex: '#FFFFFF',
    grounded: false,
    shadowApplied: false,
    shadowOpacity: 0,
    compliance: {
      keptComponents: 1,
      removedSecondaryComponents: 0,
      removedHumanLikeRegions: 0,
      removedOverlayRegions: 0,
      productAreaRatio: scaleRatio,
      suitableForMainListing: true,
      notices: ['Upload already passed compliance checks. No extra processing applied.'],
    },
  };
};

type AuditCheckId = AuditSnapshot['checks'][number]['id'];

const getFailedCheckIds = (snapshot: AuditSnapshot) =>
  snapshot.checks.filter((check) => !check.pass).map((check) => check.id);

const hasHardFailure = (failedCheckIds: AuditCheckId[]) =>
  failedCheckIds.some((id) => id === 'dimensions' || id === 'file-format' || id === 'file-size');

const shouldSkipByQuickLayer = (snapshot: AuditSnapshot, failedCheckIds: AuditCheckId[], hasOurMetadata: boolean) => {
  // If all checks pass, ONLY skip if we have EXPLICIT proof it's already processed
  if (failedCheckIds.length === 0) {
    // MUST have our metadata to skip - don't trust visual analysis alone
    if (hasOurMetadata) {
      console.log('[Skip] All checks pass + has our metadata - safe to skip');
      return true;
    }
    // Even if it looks like our output, process it to be safe
    // (might have text overlays, watermarks, secondary objects, etc.)
    console.log('[Skip rejected] All checks pass but NO metadata - processing for safety (may have overlays/watermarks)');
    return false;
  }
  if (hasHardFailure(failedCheckIds)) return false;

  const onlySoftFailures = failedCheckIds.every((id) => id === 'white-background' || id === 'product-fill');
  if (!onlySoftFailures) return false;

  // Product-fill is advisory for this tool; avoid destructive re-runs for this alone.
  if (!failedCheckIds.includes('white-background')) return true;

  // CRITICAL: Never skip if background is heavily non-white (colored, dark, etc.)
  // Only skip for near-white backgrounds or light shadows
  if (snapshot.nonWhiteBackgroundRatio > 0.35) {
    console.log('[Skip rejected] Background is heavily non-white (ratio:', snapshot.nonWhiteBackgroundRatio.toFixed(3), ') - must process');
    return false;
  }

  // Layer 1: Fast skip for obvious shadow-only or near-white cases
  const veryLikelyShadowOnly =
    failedCheckIds.length === 1 &&
    snapshot.backgroundDiagnostics.shadowLikely &&
    snapshot.nonWhiteBackgroundRatio <= 0.15;

  // Also skip if the non-white ratio is very low, even without shadow pattern
  // (likely just sensor noise, JPEG artifacts, or very subtle near-white)
  const likelyNearWhiteOnly =
    failedCheckIds.length === 1 &&
    snapshot.nonWhiteBackgroundRatio <= 0.08;

  return veryLikelyShadowOnly || likelyNearWhiteOnly;
};

const shouldRunBackgroundVerificationLayer = (failedCheckIds: AuditCheckId[]) => {
  if (!failedCheckIds.includes('white-background')) return false;
  return failedCheckIds.every((id) => id === 'white-background' || id === 'product-fill');
};

const shouldSkipProcessing = async (file: File, snapshot: AuditSnapshot | null, forceProcess: boolean = false) => {
  // Force processing override - bypass all skip gates
  if (forceProcess) {
    console.log('[Force] Force processing enabled - bypassing all skip gates');
    return false;
  }

  // Phase 2 Safety Gate #1: Check for our own EXIF metadata marker
  let hasOurMetadata = false;
  try {
    hasOurMetadata = await hasProcessedMetadata(file);
    if (hasOurMetadata) {
      console.log('[Skip] Image has ProcessedByFixPicturesApp metadata - already processed');
      return true;
    }
  } catch (error) {
    console.warn('Failed to check EXIF metadata:', error);
  }

  // Phase 2 Safety Gate #2: Check if it looks like our output (2000x2000 + uniform white bg)
  // NOTE: We still check this for informational purposes but DON'T skip based on it alone
  // Only metadata is trustworthy proof of processing
  let looksLikeOurs = false;
  try {
    looksLikeOurs = await looksLikeOurOutput(file);
    if (looksLikeOurs) {
      console.log('[Info] Image looks like our output (2000x2000 + uniform white) but no metadata - will still process');
    }
  } catch (error) {
    console.warn('Failed to check image characteristics:', error);
  }

  if (!snapshot) return false;

  const failedCheckIds = getFailedCheckIds(snapshot);
  if (hasHardFailure(failedCheckIds)) return false;
  if (shouldSkipByQuickLayer(snapshot, failedCheckIds, hasOurMetadata)) return true;
  if (!shouldRunBackgroundVerificationLayer(failedCheckIds)) return false;

  try {
    return await isBackgroundLikelyAlreadyCompliant(file, snapshot);
  } catch {
    return false;
  }
};

const isBackgroundLikelyAlreadyCompliant = async (file: File, snapshot: AuditSnapshot) => {
  // Safety check: Never skip if background is heavily non-white
  if (snapshot.nonWhiteBackgroundRatio > 0.35) {
    console.log('[Layer 2] Background ratio too high (', snapshot.nonWhiteBackgroundRatio.toFixed(3), ') - rejecting skip');
    return false;
  }

  const frame = await readImageFrame(file);
  const { width, height, data } = frame;
  const total = width * height;
  if (total <= 0) return false;

  const reachable = buildReachableBackgroundMask(data, width, height);
  const bounds = snapshot.foregroundBounds;
  const yPad = Math.max(2, Math.floor(height * 0.01));
  const xPad = Math.max(8, Math.floor(width * 0.1));
  const xLeft = bounds ? Math.max(0, bounds.minX - xPad) : 0;
  const xRight = bounds ? Math.min(width - 1, bounds.maxX + xPad) : width - 1;

  let backgroundCount = 0;
  let nonWhiteCount = 0;
  let problematicCount = 0;
  let belowCount = 0;
  let aboveCount = 0;
  let nearBottomCount = 0;

  for (let i = 0; i < total; i += 1) {
    if (!reachable[i]) continue;
    backgroundCount += 1;

    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    if (r >= 250 && g >= 250 && b >= 250) continue;

    nonWhiteCount += 1;
    const brightness = (r + g + b) / 3;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const saturation = max === 0 ? 0 : chroma / max;

    // More lenient thresholds: accept lighter grays and near-white tints
    const problematic =
      brightness < 178 ||
      chroma > 35 ||
      (saturation > 0.22 && brightness < 230);
    if (problematic) {
      problematicCount += 1;
    }

    if (!bounds) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    if (y >= bounds.maxY + yPad) {
      belowCount += 1;
      if (x >= xLeft && x <= xRight) {
        nearBottomCount += 1;
      }
    } else if (y <= bounds.minY - yPad) {
      aboveCount += 1;
    }
  }

  if (backgroundCount <= 0 || nonWhiteCount <= 0) return true;

  const nonWhiteRatio = nonWhiteCount / backgroundCount;
  const problematicRatio = problematicCount / backgroundCount;

  // Layer 2: More lenient thresholds for "do no harm" policy
  if (!bounds) {
    // No foreground detected - accept if mostly white/near-white
    return nonWhiteRatio <= 0.25 && problematicRatio <= 0.015;
  }

  const belowRatio = belowCount / nonWhiteCount;
  const aboveRatio = aboveCount / nonWhiteCount;
  const nearBottomRatio = nearBottomCount / nonWhiteCount;

  // Relaxed shadow detection: softer distribution requirements
  const shadowLikeDistribution =
    belowRatio >= 0.52 &&
    aboveRatio <= 0.28 &&
    nearBottomRatio >= 0.38 &&
    problematicRatio <= 0.025;

  // Expanded acceptance for near-white backgrounds (likely already compliant)
  const likelyStaticFalseNegative = nonWhiteRatio <= 0.32 && problematicRatio <= 0.02;

  // Accept diffuse/soft shadows that don't meet strict distribution but are still benign
  const softShadowPattern =
    belowRatio >= 0.45 &&
    aboveRatio <= 0.35 &&
    nonWhiteRatio <= 0.28 &&
    problematicRatio <= 0.03;

  return shadowLikeDistribution || likelyStaticFalseNegative || softShadowPattern;
};

const readImageFrame = (file: File) =>
  new Promise<{ width: number; height: number; data: Uint8ClampedArray }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          reject(new Error('Unable to create image context.'));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        const frame = context.getImageData(0, 0, width, height);
        resolve({ width, height, data: frame.data });
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode image for background verification.'));
    };

    image.src = url;
  });

const buildReachableBackgroundMask = (data: Uint8ClampedArray, width: number, height: number) => {
  const total = width * height;
  const reachable = new Uint8Array(total);
  const candidate = new Uint8Array(total);
  const queue = new Int32Array(total);
  const [refR, refG, refB] = sampleCornerReference(data, width, height);
  const tolerance = 46;

  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const brightness = (r + g + b) / 3;
    if (
      Math.abs(r - refR) <= tolerance &&
      Math.abs(g - refG) <= tolerance &&
      Math.abs(b - refB) <= tolerance &&
      brightness >= 150
    ) {
      candidate[i] = 1;
    }
  }

  let head = 0;
  let tail = 0;
  const enqueue = (x: number, y: number) => {
    const idx = y * width + x;
    if (!candidate[idx] || reachable[idx]) return;
    reachable[idx] = 1;
    queue[tail] = idx;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  return reachable;
};

const sampleCornerReference = (data: Uint8ClampedArray, width: number, height: number): [number, number, number] => {
  const pad = Math.max(6, Math.floor(Math.min(width, height) * 0.03));
  const points: Array<[number, number]> = [
    [pad, pad],
    [width - 1 - pad, pad],
    [pad, height - 1 - pad],
    [width - 1 - pad, height - 1 - pad],
  ];

  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const idx = (y * width + x) * 4;
    r += data[idx];
    g += data[idx + 1];
    b += data[idx + 2];
  }

  return [Math.round(r / points.length), Math.round(g / points.length), Math.round(b / points.length)];
};

export default App;
