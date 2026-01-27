import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';
import { PLAN_PRICING, type PlanTier } from '@/lib/plans';
import { useUserProfile } from '@/hooks/useUserProfile';

interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  billing_interval: string;
  current_period_end: string | null;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  email: string | null;
}

export function SuperAdminSubscriptions() {
  const { userRole } = useAuth();
  const { formatCurrency } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSubscriptions();
    }
  }, [userRole]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    const [subsRes, profilesRes] = await Promise.all([
      supabase.from('subscriptions').select('id, user_id, tier, status, billing_interval, current_period_end, created_at'),
      supabase.from('profiles').select('user_id, business_name, full_name, email'),
    ]);

    if (subsRes.error || profilesRes.error) {
      toast.error('Failed to load subscription records.');
      setLoading(false);
      return;
    }

    setSubscriptions(subsRes.data || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  const profileByUser = useMemo(() => new Map(profiles.map(profile => [profile.user_id, profile])), [profiles]);
  const activeCount = subscriptions.filter(sub => sub.status?.toLowerCase() === 'active').length;

  const subscriptionRevenue = useMemo(() => {
    return subscriptions.reduce((sum, sub) => {
      if (sub.status?.toLowerCase() !== 'active') return sum;
      const tier = sub.tier as PlanTier;
      const pricing = PLAN_PRICING[tier];
      if (!pricing) return sum;
      const interval = sub.billing_interval?.toLowerCase() || 'monthly';
      const isYearly = interval.includes('year');
      const amount = isYearly ? pricing.yearly : pricing.monthly;
      if (!amount) return sum;
      return sum + (isYearly ? amount / 12 : amount);
    }, 0);
  }, [subscriptions]);

  const customCount = subscriptions.filter(sub => {
    const pricing = PLAN_PRICING[sub.tier as PlanTier];
    return !pricing || (pricing.monthly == null && pricing.yearly == null);
  }).length;

  return (
    <SuperAdminShell>
      <header className="px-6 pt-8 pb-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="super-admin-pill">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
              Subscription Control
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold">Subscriptions</h1>
            <p className="text-slate-300 max-w-2xl text-sm sm:text-base">
              Monitor plan tiers, renewal cycles, and active status for every client.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
            onClick={fetchSubscriptions}
          >
            Refresh Subscriptions
          </Button>
        </div>
        <div className="mt-6">
          <SuperAdminNav />
        </div>
      </header>

      <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-6">
        {loading ? (
          <div className="super-admin-card w-full text-center space-y-3">
            <div className="super-admin-pill mx-auto">Loading Subscriptions</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Fetching subscription data...</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total Subscriptions', value: subscriptions.length },
                { label: 'Active Subscriptions', value: activeCount },
                { label: 'Monthly Revenue', value: formatCurrency(subscriptionRevenue) },
                { label: 'Custom Plans', value: customCount },
              ].map(card => (
                <div key={card.label} className="super-admin-card">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
                  <p className="text-2xl font-semibold mt-3">{card.value}</p>
                </div>
              ))}
            </section>

            <section className="super-admin-card space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Subscription Ledger</h2>
                <p className="text-xs text-slate-400 mt-1">Review plan tiers and renewal timing.</p>
              </div>

              {subscriptions.length === 0 ? (
                <p className="text-sm text-slate-400">No subscription records available.</p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map(subscription => {
                    const profile = profileByUser.get(subscription.user_id);
                    return (
                      <div
                        key={subscription.id}
                        className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {profile?.business_name || profile?.full_name || 'Client account'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">{profile?.email || 'No email'}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {subscription.billing_interval} • Created {new Date(subscription.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                            {subscription.tier}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                            subscription.status === 'active'
                              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                              : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                          }`}>
                            {subscription.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </SuperAdminShell>
  );
}
