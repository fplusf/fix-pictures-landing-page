import { supabase } from './supabase';

export type PayPalPlan = 'starter' | 'growth' | 'pro';

export const PLAN_META: Record<PayPalPlan, { amount: string; label: string; credits: number }> = {
  starter: { amount: '19.00', label: 'Starter', credits: 100 },
  growth:  { amount: '49.00', label: 'Growth',  credits: 500 },
  pro:     { amount: '99.00', label: 'Pro',      credits: 1500 },
};

export async function openCheckout(plan: PayPalPlan, _email?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-paypal-order', {
    body: { plan },
  });

  if (error || !data?.approvalUrl) {
    const msg = data?.error ?? error?.message ?? 'Could not open checkout. Please try again.';
    throw new Error(String(msg));
  }

  window.location.href = data.approvalUrl;
}
