export type PlanTier = 'free' | 'starter' | 'agency' | 'large_agency';

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  starter: 'Starter',
  agency: 'Agency',
  large_agency: 'Large Agency',
};

export const PLAN_LIMITS: Record<
  PlanTier,
  { contractors: number | null; activeProjects: number | null }
> = {
  free: { contractors: 2, activeProjects: 1 },
  starter: { contractors: 25, activeProjects: null },
  agency: { contractors: 150, activeProjects: null },
  large_agency: { contractors: null, activeProjects: null },
};

export const PLAN_PRICING: Record<
  PlanTier,
  { monthly: number | null; yearly: number | null }
> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 5, yearly: 50 },
  agency: { monthly: 15, yearly: 150 },
  large_agency: { monthly: null, yearly: null },
};

export const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: [
    'Up to 2 contractors',
    '1 active project',
    'Expense tracking',
    'Basic reports',
    'CSV export',
    'Secure cloud storage',
  ],
  starter: [
    'Up to 25 contractors',
    'Unlimited projects',
    'Full expense tracking',
    'Profit per project',
    'Unlimited CSV exports',
    'Professional payslips',
    'Email support',
  ],
  agency: [
    'Up to 150 contractors',
    'Unlimited projects',
    'Advanced reports',
    'Priority email support',
  ],
  large_agency: [
    '150+ contractors',
    'Custom data limits',
    'Dedicated support',
    'Tailored onboarding',
  ],
};
