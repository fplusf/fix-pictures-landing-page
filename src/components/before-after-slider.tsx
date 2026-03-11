import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
}

export const BeforeAfterSlider = ({ beforeSrc, afterSrc }: BeforeAfterSliderProps) => {
  const [position, setPosition] = useState(40);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);

  const clamp = useCallback((value: number) => Math.max(2, Math.min(98, value)), []);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width <= 0) return;
      const next = ((clientX - rect.left) / rect.width) * 100;
      setPosition(clamp(next));
    },
    [clamp],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      activePointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== event.pointerId) return;
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerRelease = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    activePointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyboard = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setPosition((value) => clamp(value - 2));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setPosition((value) => clamp(value + 2));
      }
    },
    [clamp],
  );

  return (
    <div className="select-none">
      <div
        ref={frameRef}
        className="relative touch-none select-none overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
      >
        <div className="relative w-full pb-[100%]">
          <img
            src={beforeSrc}
            alt="Before fix"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain bg-white"
          />
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
            <img
              src={afterSrc}
              alt="After fix"
              draggable={false}
              className="pointer-events-none h-full w-full select-none object-contain bg-white"
            />
          </div>
          <div className="absolute inset-y-0 z-10 cursor-ew-resize" style={{ left: `${position}%` }}>
            <div className="h-full w-px -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(24,24,27,0.2)]" />
            <button
              type="button"
              className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-zinc-300 bg-white text-xs font-semibold text-zinc-600 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label="Drag to compare before and after"
              onKeyDown={handleKeyboard}
            >
              ||
            </button>
          </div>
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-zinc-600">Before</span>
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-zinc-600">After</span>
        </div>
      </div>
    </div>
  );
};
