import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  Banknote,
  Briefcase,
  CalendarClock,
  Database,
  FileSpreadsheet,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { exportToCSV, formatCurrencyForCSV, formatDateForCSV } from '@/lib/csv-export';
import { PLAN_PRICING, type PlanTier } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';

interface ProfileRow {
  id: string;
  full_name: string | null;
  business_name: string | null;
  created_at: string;
  email: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  status: string;
  total_budget: number;
  created_at: string;
}

interface ContractorRow {
  id: string;
  full_name: string;
  status: string;
  created_at: string;
}

interface ProjectTeamRow {
  id: string;
  project_id: string;
  contractor_id: string;
  payment_type: string;
  agreed_amount: number;
  percentage_share: number;
  payment_status: string;
  created_at: string;
}

interface PaymentRow {
  id: string;
  project_id: string;
  contractor_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  tier: string;
  status: string;
  billing_interval: string;
  created_at: string;
}

export function SuperAdminDashboard() {
  const { userRole, signOut } = useAuth();
  const { formatCurrency } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [contractors, setContractors] = useState<ContractorRow[]>([]);
  const [teams, setTeams] = useState<ProjectTeamRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSuperAdminData();
    }
  }, [userRole]);

  const fetchSuperAdminData = async () => {
    setLoading(true);
    const [
      profilesRes,
      projectsRes,
      contractorsRes,
      teamsRes,
      paymentsRes,
      subscriptionsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, business_name, created_at, email'),
      supabase.from('projects').select('id, name, client_name, status, total_budget, created_at'),
      supabase.from('contractors').select('id, full_name, status, created_at'),
      supabase.from('project_teams').select('id, project_id, contractor_id, payment_type, agreed_amount, percentage_share, payment_status, created_at'),
      supabase.from('payments').select('id, project_id, contractor_id, amount_paid, payment_date, payment_method, created_at'),
      supabase.from('subscriptions').select('id, tier, status, billing_interval, created_at'),
    ]);

    const errors = [
      profilesRes.error,
      projectsRes.error,
      contractorsRes.error,
      teamsRes.error,
      paymentsRes.error,
      subscriptionsRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error('Unable to load super admin metrics.');
      setLoading(false);
      return;
    }

    setProfiles(profilesRes.data || []);
    setProjects(projectsRes.data || []);
    setContractors(contractorsRes.data || []);
    setTeams(teamsRes.data || []);
    setPayments(paymentsRes.data || []);
    setSubscriptions(subscriptionsRes.data || []);
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const projectsById = new Map(projects.map(project => [project.id, project]));
    const paymentsByPair = new Map<string, number>();

    payments.forEach(payment => {
      const key = `${payment.project_id}:${payment.contractor_id}`;
      paymentsByPair.set(key, (paymentsByPair.get(key) || 0) + Number(payment.amount_paid || 0));
    });

    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
    const totalCommitted = teams.reduce((sum, team) => {
      const project = projectsById.get(team.project_id);
      if (!project) return sum;
      const commitment = team.payment_type === 'Fixed Amount'
        ? Number(team.agreed_amount || 0)
        : (Number(project.total_budget || 0) * Number(team.percentage_share || 0)) / 100;
      return sum + commitment;
    }, 0);

    const outstanding = Math.max(totalCommitted - totalPaid, 0);
    const activeProjects = projects.filter(project => project.status?.toLowerCase() === 'active').length;
    const activeContractors = contractors.filter(contractor => contractor.status?.toLowerCase() === 'active').length;
    const activeSubscriptions = subscriptions.filter(sub => sub.status?.toLowerCase() === 'active').length;
    const assignmentsWithPayments = teams.filter(team => {
      const key = `${team.project_id}:${team.contractor_id}`;
      return (paymentsByPair.get(key) || 0) > 0;
    }).length;
    const subscriptionRevenue = subscriptions.reduce((sum, sub) => {
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

    return {
      totalPaid,
      totalCommitted,
      outstanding,
      activeProjects,
      activeContractors,
      activeSubscriptions,
      assignmentsWithPayments,
      subscriptionRevenue,
    };
  }, [projects, contractors, teams, payments, subscriptions]);

  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 5);
  }, [payments]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [projects]);

  const recentSignups = useMemo(() => {
    return [...profiles]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [profiles]);

  const outstandingAssignments = useMemo(() => {
    const projectsById = new Map(projects.map(project => [project.id, project]));
    const contractorsById = new Map(contractors.map(contractor => [contractor.id, contractor]));
    const paymentsByPair = new Map<string, number>();

    payments.forEach(payment => {
      const key = `${payment.project_id}:${payment.contractor_id}`;
      paymentsByPair.set(key, (paymentsByPair.get(key) || 0) + Number(payment.amount_paid || 0));
    });

    return teams
      .map(team => {
        const project = projectsById.get(team.project_id);
        const contractor = contractorsById.get(team.contractor_id);
        if (!project || !contractor) return null;
        const expected = team.payment_type === 'Fixed Amount'
          ? Number(team.agreed_amount || 0)
          : (Number(project.total_budget || 0) * Number(team.percentage_share || 0)) / 100;
        const paid = paymentsByPair.get(`${team.project_id}:${team.contractor_id}`) || 0;
        const balance = expected - paid;
        return {
          id: team.id,
          projectName: project.name,
          contractorName: contractor.full_name,
          balance,
        };
      })
      .filter((entry): entry is { id: string; projectName: string; contractorName: string; balance: number } => Boolean(entry))
      .filter(entry => entry.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [projects, contractors, teams, payments]);

  const handleExportPayments = () => {
    if (payments.length === 0) {
      toast.error('No payment history to export.');
      return;
    }
    const exportData = payments.map(payment => ({
      payment_date: formatDateForCSV(payment.payment_date),
      amount_paid: formatCurrencyForCSV(Number(payment.amount_paid || 0)),
      payment_method: payment.payment_method,
      project_id: payment.project_id,
      contractor_id: payment.contractor_id,
    }));
    exportToCSV(exportData, `super-admin-payments-${new Date().toISOString().split('T')[0]}`, {
      payment_date: 'Payment Date',
      amount_paid: 'Amount Paid',
      payment_method: 'Method',
      project_id: 'Project ID',
      contractor_id: 'Contractor ID',
    });
    toast.success('Payment history exported.');
  };

  const handleExportProjects = () => {
    if (projects.length === 0) {
      toast.error('No project history to export.');
      return;
    }
    const exportData = projects.map(project => ({
      created_at: formatDateForCSV(project.created_at),
      name: project.name,
      client_name: project.client_name,
      status: project.status,
      total_budget: formatCurrencyForCSV(Number(project.total_budget || 0)),
    }));
    exportToCSV(exportData, `super-admin-projects-${new Date().toISOString().split('T')[0]}`, {
      created_at: 'Created Date',
      name: 'Project',
      client_name: 'Client',
      status: 'Status',
      total_budget: 'Total Budget',
    });
    toast.success('Project history exported.');
  };

  if (loading) {
    return (
      <SuperAdminShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3 animate-fade-in">
            <div className="super-admin-pill mx-auto">Loading Metrics</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Preparing your command view...</p>
          </div>
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell>
      <div>
        <header className="px-6 pt-8 pb-6 sm:px-10 lg:px-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="super-admin-pill">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                Super Admin
              </div>
              <p className="text-slate-300 max-w-2xl text-sm sm:text-base">
                Oversee every client, project, contractor, and payment workflow across the platform.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                onClick={handleExportPayments}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Payments
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                onClick={handleExportProjects}
              >
                <Database className="h-4 w-4 mr-2" />
                Export Projects
              </Button>
              <Button
                className="rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-md">
              <Input
                placeholder="Search clients, projects, or contractors..."
                className="bg-slate-950/40 border-slate-700/70 text-slate-100 placeholder:text-slate-500"
                disabled
              />
              <Activity className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            <span className="text-xs text-slate-400">
              Live data refreshes with each action recorded on the platform.
            </span>
          </div>
          <div className="mt-6">
            <SuperAdminNav />
          </div>
        </header>

        <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Client Accounts',
                value: profiles.length,
                sub: `${metrics.activeSubscriptions} active subscriptions`,
                icon: Users,
              },
              {
                label: 'Projects In Flight',
                value: projects.length,
                sub: `${metrics.activeProjects} active`,
                icon: Briefcase,
              },
              {
                label: 'Contractor Network',
                value: contractors.length,
                sub: `${metrics.activeContractors} active`,
                icon: ShieldCheck,
              },
              {
                label: 'Assignments',
                value: teams.length,
                sub: `${metrics.assignmentsWithPayments} with payments`,
                icon: BadgeCheck,
              },
              {
                label: 'Payments Processed',
                value: payments.length,
                sub: formatCurrency(metrics.totalPaid),
                icon: Banknote,
              },
              {
                label: 'Outstanding Commitments',
                value: formatCurrency(metrics.outstanding),
                sub: `${formatCurrency(metrics.totalCommitted)} total committed`,
                icon: Landmark,
              },
              {
                label: 'Subscription Revenue',
                value: formatCurrency(metrics.subscriptionRevenue),
                sub: 'Monthly subscription revenue',
                icon: Sparkles,
              },
              {
                label: 'Subscriptions',
                value: subscriptions.length,
                sub: `${metrics.activeSubscriptions} active`,
                icon: CalendarClock,
              },
            ].map(card => (
              <div key={card.label} className="super-admin-card animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
                    <p className="text-3xl font-semibold mt-3 super-admin-mono">{card.value}</p>
                    <p className="text-xs text-slate-400 mt-2">{card.sub}</p>
                  </div>
                  <div className="h-11 w-11 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 flex items-center justify-center">
                    <card.icon className="h-5 w-5 text-cyan-200" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-6">
              <div className="super-admin-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Revenue Pulse</p>
                    <h2 className="text-xl font-semibold mt-2">Payment Integrity</h2>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    {metrics.totalCommitted > 0
                      ? `${Math.round((metrics.totalPaid / metrics.totalCommitted) * 100)}% covered`
                      : 'No commitments'}
                  </span>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Paid</p>
                    <p className="text-2xl font-semibold mt-2">{formatCurrency(metrics.totalPaid)}</p>
                    <p className="text-xs text-slate-400 mt-2">{payments.length} payouts recorded</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Outstanding</p>
                    <p className="text-2xl font-semibold mt-2">{formatCurrency(metrics.outstanding)}</p>
                    <p className="text-xs text-slate-400 mt-2">Across {teams.length} assignments</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3 text-xs text-slate-300">
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3">
                    <p className="text-slate-400">Active subscriptions</p>
                    <p className="text-lg font-semibold mt-2">{metrics.activeSubscriptions}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3">
                    <p className="text-slate-400">New clients</p>
                    <p className="text-lg font-semibold mt-2">
                      {profiles.filter(profile => {
                        const created = new Date(profile.created_at);
                        const now = new Date();
                        return now.getTime() - created.getTime() < 1000 * 60 * 60 * 24 * 30;
                      }).length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3">
                    <p className="text-slate-400">Projects live</p>
                    <p className="text-lg font-semibold mt-2">{metrics.activeProjects}</p>
                  </div>
                </div>
              </div>

              <div className="super-admin-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Command Actions</p>
                    <h2 className="text-xl font-semibold mt-2">Super Admin Toolkit</h2>
                  </div>
                  <Link
                    to="/super-admin/clients"
                    className="text-xs text-cyan-200 hover:text-cyan-100"
                  >
                    View client access
                  </Link>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    {
                      title: 'Client Directory',
                      detail: 'Audit onboarding, status, and account health.',
                      to: '/super-admin/clients',
                    },
                    {
                      title: 'Project Ledger',
                      detail: 'Review budgets, milestones, and assignments.',
                      to: '/super-admin/projects',
                    },
                    {
                      title: 'Contractor Compliance',
                      detail: 'Check contractor status and payment readiness.',
                      to: '/super-admin/contractors',
                    },
                    {
                      title: 'Payout Operations',
                      detail: 'Track payments, slips, and export histories.',
                      to: '/super-admin/payments',
                    },
                  ].map(item => (
                    <div key={item.title} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 flex flex-col justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-2">{item.detail}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link to={item.to}>
                          <Button
                            variant="outline"
                            className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                          >
                            View
                          </Button>
                        </Link>
                        <Link to={item.to}>
                          <Button
                            className="rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300"
                          >
                            Open Console
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="super-admin-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Exception Queue</p>
                    <h2 className="text-xl font-semibold mt-2">Outstanding Assignments</h2>
                  </div>
                  <span className="text-xs text-slate-400">{outstandingAssignments.length} flagged</span>
                </div>
                <div className="mt-5 space-y-3">
                  {outstandingAssignments.length === 0 ? (
                    <p className="text-sm text-slate-400">No outstanding balances detected.</p>
                  ) : (
                    outstandingAssignments.map(item => (
                      <div key={item.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{item.contractorName}</p>
                            <p className="text-xs text-slate-400 mt-1">{item.projectName}</p>
                          </div>
                          <p className="text-sm font-semibold text-amber-200">{formatCurrency(item.balance)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="super-admin-card">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Recent Activity</p>
                  <h2 className="text-xl font-semibold mt-2">Latest Platform Moves</h2>
                </div>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-xs text-slate-400">Recent payments</p>
                    <div className="mt-3 space-y-3">
                      {recentPayments.length === 0 ? (
                        <p className="text-sm text-slate-400">No payments yet.</p>
                      ) : (
                        recentPayments.map(payment => (
                          <div key={payment.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold">{formatCurrency(Number(payment.amount_paid || 0))}</p>
                                <p className="text-xs text-slate-400">{payment.payment_method}</p>
                              </div>
                              <p className="text-xs text-slate-400">{new Date(payment.payment_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">New projects</p>
                    <div className="mt-3 space-y-3">
                      {recentProjects.length === 0 ? (
                        <p className="text-sm text-slate-400">No projects created yet.</p>
                      ) : (
                        recentProjects.map(project => (
                          <div key={project.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold">{project.name}</p>
                                <p className="text-xs text-slate-400">{project.client_name}</p>
                              </div>
                              <span className="text-xs text-slate-400">{project.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Newest client signups</p>
                    <div className="mt-3 space-y-3">
                      {recentSignups.length === 0 ? (
                        <p className="text-sm text-slate-400">No new clients yet.</p>
                      ) : (
                        recentSignups.map(profile => (
                          <div key={profile.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold">
                                  {profile.business_name || profile.full_name || 'New client'}
                                </p>
                                <p className="text-xs text-slate-400">{profile.email || 'No email'}</p>
                              </div>
                              <span className="text-xs text-slate-400">
                                {new Date(profile.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </SuperAdminShell>
  );
}
