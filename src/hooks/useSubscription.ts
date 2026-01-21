import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_LABELS, PLAN_LIMITS, type PlanTier } from '@/lib/plans';

interface SubscriptionState {
  tier: PlanTier;
  status: string;
  billing_interval: string;
  current_period_end: string | null;
}

const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  tier: 'free',
  status: 'active',
  billing_interval: 'month',
  current_period_end: null,
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(DEFAULT_SUBSCRIPTION);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('tier, status, billing_interval, current_period_end')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setSubscription({
        tier: data.tier as PlanTier,
        status: data.status,
        billing_interval: data.billing_interval,
        current_period_end: data.current_period_end,
      });
    } else {
      setSubscription(DEFAULT_SUBSCRIPTION);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const limits = PLAN_LIMITS[subscription.tier];
  const tierLabel = PLAN_LABELS[subscription.tier];

  return {
    subscription,
    limits,
    tierLabel,
    loading,
    refetch: fetchSubscription,
  };
}
