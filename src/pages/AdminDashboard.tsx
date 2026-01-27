import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PLAN_LABELS, type PlanTier } from '@/lib/plans';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, CreditCard, FolderKanban, Receipt, ShieldX, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const TIERS: PlanTier[] = ['free', 'starter', 'agency', 'large_agency'];

export function AdminDashboard() {
  const { userRole } = useAuth();
  const { formatCurrency } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    contractors: 0,
    activeContractors: 0,
    projects: 0,
    activeProjects: 0,
    payments: 0,
    totalPaid: 0,
    totalExpenses: 0,
  });
  const [subscriptionCounts, setSubscriptionCounts] = useState<Record<PlanTier, number>>({
    free: 0,
    starter: 0,
    agency: 0,
    large_agency: 0,
  });

  useEffect(() => {
    if (userRole === 'admin') {
      fetchAdminStats();
    }
  }, [userRole]);

  const fetchAdminStats = async () => {
    setLoading(true);
    const [contractorsRes, projectsRes, paymentsRes, expensesRes, subscriptionsRes] = await Promise.all([
      supabase.from('contractors').select('id, status'),
      supabase.from('projects').select('id, status'),
      supabase.from('payments').select('amount_paid'),
      supabase.from('expenses').select('amount'),
      supabase.from('subscriptions').select('tier'),
    ]);

    const errors = [
      contractorsRes.error,
      projectsRes.error,
      paymentsRes.error,
      expensesRes.error,
      subscriptionsRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error('Failed to load admin metrics.');
      setLoading(false);
      return;
    }

    const contractors = contractorsRes.data || [];
    const projects = projectsRes.data || [];
    const payments = paymentsRes.data || [];
    const expenses = expensesRes.data || [];
    const subscriptions = subscriptionsRes.data || [];

    const tierCounts = TIERS.reduce((acc, tier) => {
      acc[tier] = subscriptions.filter((sub) => sub.tier === tier).length;
      return acc;
    }, {} as Record<PlanTier, number>);

    setStats({
      contractors: contractors.length,
      activeContractors: contractors.filter((c) => c.status === 'Active').length,
      projects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'Active').length,
      payments: payments.length,
      totalPaid: payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0),
      totalExpenses: expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    });
    setSubscriptionCounts(tierCounts);
    setLoading(false);
  };

  const statCards = useMemo(
    () => [
      {
        label: 'Total Contractors',
        value: stats.contractors,
        sublabel: `${stats.activeContractors} active`,
        icon: Users,
        color: 'bg-info/10 text-info',
      },
      {
        label: 'Total Projects',
        value: stats.projects,
        sublabel: `${stats.activeProjects} active`,
        icon: FolderKanban,
        color: 'bg-primary/10 text-primary',
      },
      {
        label: 'Payments Recorded',
        value: stats.payments,
        sublabel: formatCurrency(stats.totalPaid),
        icon: CreditCard,
        color: 'bg-success/10 text-success',
      },
      {
        label: 'Total Expenses',
        value: formatCurrency(stats.totalExpenses),
        sublabel: 'Tracked costs',
        icon: Receipt,
        color: 'bg-warning/10 text-warning',
      },
    ],
    [formatCurrency, stats],
  );

  if (userRole !== 'admin') {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-description">Monitor users, subscriptions, and activity across the platform.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link to="/admin/users">
            <Button variant="outline" className="w-full sm:w-auto">
              Manage Users
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" className="w-full sm:w-auto">
              View Pricing
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-card-label">{stat.label}</p>
                <p className="stat-card-value">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.sublabel}</p>
              </div>
              <div className={`stat-card-icon ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              Subscription Mix
            </CardTitle>
            <CardDescription>Current users by plan tier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {TIERS.map((tier) => (
              <div key={tier} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium">{PLAN_LABELS[tier]}</span>
                <span className="text-sm text-muted-foreground">{subscriptionCounts[tier]}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Wallet className="w-3.5 h-3.5" />
              Totals update in real time as subscriptions change.
            </div>
          </CardContent>
        </Card>

        <ActivityLog />
      </div>
    </div>
  );
}
