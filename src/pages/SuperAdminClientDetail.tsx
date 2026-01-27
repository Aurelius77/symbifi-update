import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Mail, Receipt, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  country: string | null;
  industry: string | null;
  created_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  status: string;
  total_budget: number;
  created_at: string;
  user_id: string;
}

interface ContractorRow {
  id: string;
  full_name: string;
  status: string;
  role: string;
  created_at: string;
  user_id: string;
}

interface ProjectTeamRow {
  id: string;
  project_id: string;
  contractor_id: string;
  payment_type: string;
  agreed_amount: number;
  percentage_share: number;
  payment_status: string;
  user_id: string;
}

interface PaymentRow {
  id: string;
  project_id: string;
  contractor_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  created_at: string;
  user_id: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  billing_interval: string;
  created_at: string;
}

type ClientRole = 'admin' | 'user';

export function SuperAdminClientDetail() {
  const { clientId } = useParams();
  const { userRole } = useAuth();
  const { formatCurrency } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [contractors, setContractors] = useState<ContractorRow[]>([]);
  const [teams, setTeams] = useState<ProjectTeamRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [role, setRole] = useState<ClientRole>('user');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (userRole === 'admin' && clientId) {
      fetchClientDetail(clientId);
    }
  }, [clientId, userRole]);

  const fetchClientDetail = async (userId: string) => {
    setLoading(true);
    const [
      profileRes,
      projectsRes,
      contractorsRes,
      teamsRes,
      paymentsRes,
      subscriptionsRes,
      roleRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, user_id, full_name, business_name, email, country, industry, created_at').eq('user_id', userId).single(),
      supabase.from('projects').select('id, name, client_name, status, total_budget, created_at, user_id').eq('user_id', userId),
      supabase.from('contractors').select('id, full_name, status, role, created_at, user_id').eq('user_id', userId),
      supabase.from('project_teams').select('id, project_id, contractor_id, payment_type, agreed_amount, percentage_share, payment_status, user_id').eq('user_id', userId),
      supabase.from('payments').select('id, project_id, contractor_id, amount_paid, payment_date, payment_method, created_at, user_id').eq('user_id', userId),
      supabase.from('subscriptions').select('id, user_id, tier, status, billing_interval, created_at').eq('user_id', userId),
      supabase.from('user_roles').select('id, role').eq('user_id', userId),
    ]);

    if (profileRes.error) {
      toast.error('Unable to load client profile.');
      setLoading(false);
      return;
    }

    setProfile(profileRes.data);
    setProjects(projectsRes.data || []);
    setContractors(contractorsRes.data || []);
    setTeams(teamsRes.data || []);
    setPayments(paymentsRes.data || []);
    const sortedSubs = (subscriptionsRes.data || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setSubscription(sortedSubs[0] || null);
    const roleRow = roleRes.data?.[0];
    setRole((roleRow?.role as ClientRole) || 'user');
    setLoading(false);
  };

  const handlePromote = async () => {
    if (!profile) return;
    setPromoting(true);
    const { data: roleRows, error: roleError } = await supabase
      .from('user_roles')
      .select('id, role')
      .eq('user_id', profile.user_id);

    if (roleError) {
      toast.error('Unable to verify existing role.');
      setPromoting(false);
      return;
    }

    const existing = roleRows?.[0];
    if (existing) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('id', existing.id);
      if (error) {
        toast.error(error.message);
        setPromoting(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.user_id, role: 'admin' });
      if (error) {
        toast.error(error.message);
        setPromoting(false);
        return;
      }
    }

    setRole('admin');
    toast.success('User promoted to super admin.');
    setPromoting(false);
  };

  const metrics = useMemo(() => {
    const projectsById = new Map(projects.map(project => [project.id, project]));
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
    return { totalPaid, totalCommitted, outstanding };
  }, [projects, teams, payments]);

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    .slice(0, 4);

  if (loading) {
    return (
      <SuperAdminShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3 animate-fade-in">
            <div className="super-admin-pill mx-auto">Loading Client</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Preparing client overview...</p>
          </div>
        </div>
      </SuperAdminShell>
    );
  }

  if (!profile) {
    return (
      <SuperAdminShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3">
            <p className="text-sm text-slate-300">Client profile not found.</p>
            <Link to="/super-admin/clients" className="text-cyan-200 hover:text-cyan-100 text-sm">
              Return to clients
            </Link>
          </div>
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell>
      <header className="px-6 pt-8 pb-6 sm:px-10 lg:px-16 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Link to="/super-admin/clients" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
              <ArrowLeft className="h-4 w-4" />
              Back to clients
            </Link>
            <div className="super-admin-pill">
              <Building2 className="h-3.5 w-3.5 text-cyan-200" />
              Client Profile
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold">
              {profile.business_name || profile.full_name || 'Client Account'}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base">
              {profile.industry || 'General business'} • {profile.country || 'N/A'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              {subscription?.tier || 'no plan'}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                subscription?.status === 'active'
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                  : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
              }`}
            >
              {subscription?.status || 'inactive'}
            </span>
            <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              {role === 'admin' ? 'super admin' : 'standard user'}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="rounded-full bg-rose-500/90 text-white hover:bg-rose-500"
                  disabled={role === 'admin'}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Promote to Super Admin
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-950 border border-slate-800 text-slate-100">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-slate-100">
                    <AlertTriangle className="h-5 w-5 text-amber-300" />
                    Confirm Super Admin Promotion
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This user will gain full access to the super admin command center, including billing, payments,
                    and account oversight. Only proceed if you trust this user with full platform control.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-rose-500 text-white hover:bg-rose-400"
                    onClick={handlePromote}
                    disabled={promoting}
                  >
                    {promoting ? 'Promoting...' : 'Promote User'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <SuperAdminNav />
      </header>

      <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-6">
        <section className="super-admin-card space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-cyan-200" />
            <div>
              <p className="text-sm font-semibold">Account Contact</p>
              <p className="text-xs text-slate-400">{profile.email || 'No email'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-cyan-200" />
            <div>
              <p className="text-sm font-semibold">Joined</p>
              <p className="text-xs text-slate-400">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Projects', value: projects.length },
            { label: 'Contractors', value: contractors.length },
            { label: 'Assignments', value: teams.length },
            { label: 'Total Paid', value: formatCurrency(metrics.totalPaid) },
            { label: 'Outstanding', value: formatCurrency(metrics.outstanding) },
            { label: 'Payment Slips', value: payments.length },
          ].map(card => (
            <div key={card.label} className="super-admin-card">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
              <p className="text-2xl font-semibold mt-3">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="super-admin-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Projects</h2>
              <Link to={`/super-admin/projects?client=${profile.user_id}`} className="text-xs text-cyan-200 hover:text-cyan-100">
                View all
              </Link>
            </div>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-slate-400">No projects yet.</p>
            ) : (
              <div className="space-y-3">
                {recentProjects.map(project => (
                  <div key={project.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="text-xs text-slate-400">{project.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="super-admin-card space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-semibold">Recent Payments</h2>
            </div>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded.</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map(payment => (
                  <div key={payment.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{formatCurrency(Number(payment.amount_paid || 0))}</p>
                      <span className="text-xs text-slate-400">{new Date(payment.payment_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{payment.payment_method}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </SuperAdminShell>
  );
}
