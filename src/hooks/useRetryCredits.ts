import { useCallback, useEffect, useState } from 'react';
import type { Plan } from '@/src/hooks/useSubscription';

export const RETRY_LIMITS: Record<Plan, number> = {
  free: 3,
  starter: 10,
  growth: Infinity,
  pro: Infinity,
  lifetime: Infinity,
};

const storageKey = (userId: string) => `fix_retries_used_${userId}`;

export function useRetryCredits(userId: string | undefined, plan: Plan) {
  const [used, setUsed] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(storageKey(userId));
    setUsed(stored ? parseInt(stored, 10) : 0);
  }, [userId]);

  const limit = RETRY_LIMITS[plan];
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  const canRetry = remaining > 0;

  const consumeRetry = useCallback(() => {
    if (!userId) return;
    setUsed((prev) => {
      const next = prev + 1;
      localStorage.setItem(storageKey(userId), String(next));
      return next;
    });
  }, [userId]);

  return { used, remaining, canRetry, limit, consumeRetry };
}
