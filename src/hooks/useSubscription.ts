import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';

export type Plan = 'free' | 'pro' | 'lifetime';

export const FREE_IMAGE_LIMIT = 5;

export interface SubscriptionState {
  plan: Plan;
  imagesUsed: number;
  imagesRemaining: number; // Infinity for paid plans
  canProcess: boolean;
  loading: boolean;
  refetch: () => void;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>('free');
  const [imagesUsed, setImagesUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all([
      supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('image_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]).then(([subResult, usageResult]) => {
      const fetchedPlan = (subResult.data?.plan as Plan) ?? 'free';
      setPlan(fetchedPlan);
      setImagesUsed(usageResult.count ?? 0);
      setLoading(false);
    });
  }, [user, tick]);

  const isPaid = plan === 'pro' || plan === 'lifetime';
  const imagesRemaining = isPaid
    ? Infinity
    : Math.max(0, FREE_IMAGE_LIMIT - imagesUsed);
  const canProcess = isPaid || imagesUsed < FREE_IMAGE_LIMIT;

  return {
    plan,
    imagesUsed,
    imagesRemaining,
    canProcess,
    loading,
    refetch: () => setTick((t) => t + 1),
  };
}

/** Call this after each image is successfully processed/completed. */
export async function incrementImageUsage(userId: string): Promise<void> {
  await supabase.from('image_usage').insert({ user_id: userId });
}

/** Use this ref-based helper inside ImageFixerApp to avoid double-counting. */
export function useUsageTracker(
  completedIds: string[],
  userId: string | undefined,
  refetch: () => void,
) {
  const counted = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;
    const newIds = completedIds.filter((id) => !counted.current.has(id));
    if (!newIds.length) return;
    newIds.forEach((id) => counted.current.add(id));
    // Fire-and-forget — one insert per completed image
    Promise.all(newIds.map(() => incrementImageUsage(userId))).then(refetch);
  }, [completedIds, userId, refetch]);
}
