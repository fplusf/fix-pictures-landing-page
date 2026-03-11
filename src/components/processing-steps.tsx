import type { WorkerProgress } from '@/src/workers/ai.worker';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/button';

interface ProcessingStepsProps {
  logs: WorkerProgress[];
  onCancel?: () => void;
}

type Stage = WorkerProgress['stage'];

const STAGES: Array<{ id: Stage; title: string; fallback: string }> = [
  {
    id: 'loading',
    title: 'Loading',
    fallback: 'Preparing AI runtime',
  },
  {
    id: 'segmenting',
    title: 'Segmenting',
    fallback: 'Removing background',
  },
  {
    id: 'refining',
    title: 'Refining',
    fallback: 'Cleaning edges and halos',
  },
  {
    id: 'packaging',
    title: 'Packaging',
    fallback: 'Preparing transparent cutout',
  },
];

const stageIndex = (stage: Stage) => STAGES.findIndex((item) => item.id === stage);

const latestByStage = (logs: WorkerProgress[], stage: Stage) => {
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    if (logs[i].stage === stage) return logs[i];
  }
  return undefined;
};

export const ProcessingSteps = ({ logs, onCancel }: ProcessingStepsProps) => {
  const reachedStages = logs.map((entry) => stageIndex(entry.stage)).filter((index) => index >= 0);
  const activeIndex = reachedStages.length ? Math.max(...reachedStages) : 0;

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg">
      <p className="text-sm font-semibold text-zinc-900">Running compliance autopilot...</p>
      <p className="mt-1 text-xs text-zinc-500">Background segmentation and refinement in progress</p>
      <div className="mt-4 space-y-2">
        {STAGES.map((stage, index) => {
          const entry = latestByStage(logs, stage.id);
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;
          return (
            <div key={stage.id} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <span className="grid h-5 w-5 place-items-center">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : isActive ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">{stage.title}</p>
                <p
                  className={cn(
                    'truncate text-xs',
                    isActive ? 'text-zinc-800' : isDone ? 'text-zinc-600' : 'text-zinc-500',
                  )}
                >
                  {entry?.message ?? stage.fallback}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-10 w-full border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-100"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </div>
  );
};
