import type { ProcessedPayload, WorkerProgress } from '@/src/workers/ai.worker';

type ProgressCallback = (progress: WorkerProgress) => void;

type HandshakeResponse = {
  sessionId: string;
  token: string;
  expiresAt: string;
};

type ProcessResponse = {
  fileName: string;
  width: number;
  height: number;
  maskedImageBase64: string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  histogram: {
    average: [number, number, number];
  };
};

interface SessionState {
  baseUrl: string;
  sessionId: string;
  token: string;
  expiresAtEpochMs: number;
}

export interface LocalInferenceProbe {
  available: boolean;
  baseUrl: string | null;
  reason?: string;
}

const BASE_URL_CANDIDATES = ['http://127.0.0.1:8765', 'http://localhost:8765'];
const HANDSHAKE_REFRESH_MARGIN_MS = 25_000;

class LocalInferenceClient {
  private session: SessionState | null = null;

  private getClientIdentity() {
    const host = typeof window !== 'undefined' ? window.location.host : 'local';
    return {
      client: 'fix-pictures-web',
      extensionId: `fix-pictures-web-${host || 'localhost'}`,
      nonce: crypto.randomUUID(),
    };
  }

  private static async fetchJson<T>(input: RequestInfo, init?: RequestInit) {
    const response = await fetch(input, init);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  public async probe(): Promise<LocalInferenceProbe> {
    for (const baseUrl of BASE_URL_CANDIDATES) {
      try {
        await LocalInferenceClient.fetchJson<{ ok: boolean }>(`${baseUrl}/v1/health`, {
          method: 'GET',
        });
        return { available: true, baseUrl };
      } catch {
        // keep trying candidates
      }
    }
    return { available: false, baseUrl: null, reason: 'Local service is not reachable.' };
  }

  private isSessionValid() {
    if (!this.session) return false;
    return Date.now() + HANDSHAKE_REFRESH_MARGIN_MS < this.session.expiresAtEpochMs;
  }

  private async ensureSession(preferredBaseUrl?: string) {
    if (this.isSessionValid()) return this.session!;

    const identity = this.getClientIdentity();
    const candidates = preferredBaseUrl
      ? [preferredBaseUrl, ...BASE_URL_CANDIDATES.filter((url) => url !== preferredBaseUrl)]
      : BASE_URL_CANDIDATES;

    let lastError: Error | null = null;
    for (const baseUrl of candidates) {
      try {
        const response = await LocalInferenceClient.fetchJson<HandshakeResponse>(`${baseUrl}/v1/handshake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: identity.client,
            extensionId: identity.extensionId,
            nonce: identity.nonce,
          }),
        });
        const expiresAtEpochMs = Date.parse(response.expiresAt);
        if (!Number.isFinite(expiresAtEpochMs)) {
          throw new Error('Invalid session expiration value from local service.');
        }

        this.session = {
          baseUrl,
          sessionId: response.sessionId,
          token: response.token,
          expiresAtEpochMs,
        };
        return this.session;
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw lastError ?? new Error('Unable to establish local inference session.');
  }

  public async process(file: File, options?: { onProgress?: ProgressCallback }): Promise<ProcessedPayload> {
    options?.onProgress?.({
      id: crypto.randomUUID(),
      type: 'progress',
      stage: 'loading',
      message: 'Connecting to local GPU inference service',
    });

    let session = await this.ensureSession();
    const formData = new FormData();
    formData.append('image', file, file.name);

    const processOnce = async () => {
      const response = await fetch(`${session.baseUrl}/v1/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'X-Fix-Session': session.sessionId,
        },
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        this.session = null;
        throw new Error('SESSION_INVALID');
      }

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Local inference failed: HTTP ${response.status}`);
      }

      return response.json() as Promise<ProcessResponse>;
    };

    options?.onProgress?.({
      id: crypto.randomUUID(),
      type: 'progress',
      stage: 'segmenting',
      message: 'Running local segmentation',
    });

    let payload: ProcessResponse;
    try {
      payload = await processOnce();
    } catch (error) {
      if ((error as Error).message !== 'SESSION_INVALID') {
        throw error;
      }

      session = await this.ensureSession(session.baseUrl);
      payload = await processOnce();
    }

    options?.onProgress?.({
      id: crypto.randomUUID(),
      type: 'progress',
      stage: 'refining',
      message: 'Applying local matte refinement',
    });

    const maskedImageBuffer = base64ToArrayBuffer(payload.maskedImageBase64);

    options?.onProgress?.({
      id: crypto.randomUUID(),
      type: 'progress',
      stage: 'packaging',
      message: 'Receiving local output',
    });

    return {
      fileName: payload.fileName,
      width: payload.width,
      height: payload.height,
      maskedImageBuffer,
      bounds: payload.bounds,
      histogram: payload.histogram,
      wasEdgeEnhanced: false, // Local inference doesn't use edge enhancement yet
    };
  }
}

const base64ToArrayBuffer = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const localInferenceClient = new LocalInferenceClient();
