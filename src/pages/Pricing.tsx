import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICING, type PlanTier } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'agency', 'large_agency'];

export function Pricing() {
  const { subscription, tierLabel, refetch } = useSubscription();
  const [updatingTier, setUpdatingTier] = useState<PlanTier | null>(null);

  const handlePlanChange = async (tier: PlanTier) => {
    if (tier === subscription.tier || tier === 'large_agency') return;
    setUpdatingTier(tier);
    const { error } = await supabase.rpc('set_subscription_tier', { _tier: tier });
    if (error) {
      toast.error(error.message || 'Unable to update plan.');
    } else {
      toast.success(`Switched to ${PLAN_LABELS[tier]} plan.`);
      await refetch();
    }
    setUpdatingTier(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pricing
        </p>
        <h1 className="page-title">Simple pricing that grows with your team</h1>
        <p className="page-description">
          No hidden fees. No per-transaction charges. Pay only based on the size of your team.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Current plan: {tierLabel}
          </span>
          <Link to="/settings" className="underline-offset-4 hover:underline">
            Back to settings
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((tier) => {
          const price = PLAN_PRICING[tier];
          const features = PLAN_FEATURES[tier];
          const isCurrent = subscription.tier === tier;
          const isLarge = tier === 'large_agency';

          return (
            <Card
              key={tier}
              className={`flex h-full flex-col border-border ${
                isCurrent ? 'ring-2 ring-primary/40 shadow-lg' : 'bg-card/60'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{PLAN_LABELS[tier]}</CardTitle>
                  {tier === 'starter' && (
                    <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <CardDescription>
                  {price.monthly === null ? 'Custom pricing' : `$${price.monthly} / month`}
                </CardDescription>
                {price.yearly !== null && price.monthly !== null && (
                  <p className="text-xs text-muted-foreground">or ${price.yearly} / year</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-4">
                  {isLarge ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => toast('Contact sales to customize this plan.')}
                    >
                      Contact sales
                    </Button>
                  ) : (
                    <Button
                      variant={isCurrent ? 'secondary' : 'default'}
                      className="w-full"
                      disabled={isCurrent || updatingTier !== null}
                      onClick={() => handlePlanChange(tier)}
                    >
                      {updatingTier === tier
                        ? 'Updating...'
                        : isCurrent
                        ? 'Current plan'
                        : `Select ${PLAN_LABELS[tier]}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
