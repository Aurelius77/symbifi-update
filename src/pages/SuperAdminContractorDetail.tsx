import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, CreditCard, Mail, Phone, User, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';
import { toast } from 'sonner';

interface ContractorRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  bank_wallet_details: string | null;
  role: string;
  status: string;
  contractor_type: string;
  created_at: string;
  user_id: string;
}

interface ProjectTeamRow {
  id: string;
  project_id: string;
  payment_type: string;
  agreed_amount: number;
  percentage_share: number;
  payment_status: string;
}

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  status: string;
  total_budget: number;
}

interface PaymentRow {
  id: string;
  project_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
}

interface ProfileRow {
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  email: string | null;
}

export function SuperAdminContractorDetail() {
  const { contractorId } = useParams();
  const { userRole } = useAuth();
  const { formatCurrency } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [contractor, setContractor] = useState<ContractorRow | null>(null);
  const [teams, setTeams] = useState<ProjectTeamRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [client, setClient] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (userRole === 'admin' && contractorId) {
      fetchContractor(contractorId);
    }
  }, [contractorId, userRole]);

  const fetchContractor = async (id: string) => {
    setLoading(true);
    const { data: contractorData, error } = await supabase
      .from('contractors')
      .select('id, full_name, email, phone, bank_wallet_details, role, status, contractor_type, created_at, user_id')
      .eq('id', id)
      .single();

    if (error || !contractorData) {
      toast.error('Unable to load contractor record.');
      setLoading(false);
      return;
    }

    const [teamsRes, paymentsRes, clientRes] = await Promise.all([
      supabase
        .from('project_teams')
        .select('id, project_id, payment_type, agreed_amount, percentage_share, payment_status')
        .eq('contractor_id', id),
      supabase
        .from('payments')
        .select('id, project_id, amount_paid, payment_date, payment_method')
        .eq('contractor_id', id),
      supabase
        .from('profiles')
        .select('user_id, business_name, full_name, email')
        .eq('user_id', contractorData.user_id)
        .single(),
    ]);

    const projectIds = Array.from(new Set((teamsRes.data || []).map(team => team.project_id)));
    let projectRows: ProjectRow[] = [];
    if (projectIds.length > 0) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name, client_name, status, total_budget')
        .in('id', projectIds);
      projectRows = projectData || [];
    }

    setContractor(contractorData);
    setTeams(teamsRes.data || []);
    setPayments(paymentsRes.data || []);
    setProjects(projectRows);
    setClient(clientRes.data || null);
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const projectsById = new Map(projects.map(project => [project.id, project]));
    const paidByProject = payments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.project_id] = (acc[payment.project_id] || 0) + Number(payment.amount_paid || 0);
      return acc;
    }, {});

    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
    const totalCommitted = teams.reduce((sum, team) => {
      const project = projectsById.get(team.project_id);
      if (!project) return sum;
      const expected = team.payment_type === 'Fixed Amount'
        ? Number(team.agreed_amount || 0)
        : (Number(project.total_budget || 0) * Number(team.percentage_share || 0)) / 100;
      return sum + expected;
    }, 0);

    return {
      totalPaid,
      totalCommitted,
      outstanding: Math.max(totalCommitted - totalPaid, 0),
      paidByProject,
    };
  }, [projects, teams, payments]);

  const assignments = useMemo(() => {
    const projectsById = new Map(projects.map(project => [project.id, project]));
    return teams.map(team => {
      const project = projectsById.get(team.project_id);
      const expected = project
        ? (team.payment_type === 'Fixed Amount'
            ? Number(team.agreed_amount || 0)
            : (Number(project.total_budget || 0) * Number(team.percentage_share || 0)) / 100)
        : 0;
      const paid = metrics.paidByProject[team.project_id] || 0;
      return {
        id: team.id,
        projectName: project?.name || team.project_id,
        clientName: project?.client_name || 'Unknown client',
        status: team.payment_status,
        expected,
        paid,
        balance: Math.max(expected - paid, 0),
      };
    });
  }, [projects, teams, metrics.paidByProject]);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <SuperAdminShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3 animate-fade-in">
            <div className="super-admin-pill mx-auto">Loading Contractor</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Fetching contractor details...</p>
          </div>
        </div>
      </SuperAdminShell>
    );
  }

  if (!contractor) {
    return (
      <SuperAdminShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3">
            <p className="text-sm text-slate-300">Contractor record not found.</p>
            <Link to="/super-admin/contractors" className="text-cyan-200 hover:text-cyan-100 text-sm">
              Return to contractors
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
            <Link to="/super-admin/contractors" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
              <ArrowLeft className="h-4 w-4" />
              Back to contractors
            </Link>
            <div className="super-admin-pill">
              <Users className="h-3.5 w-3.5 text-cyan-200" />
              Contractor Profile
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold">{contractor.full_name}</h1>
            <p className="text-slate-300 text-sm sm:text-base">
              {contractor.role} • {contractor.contractor_type}
            </p>
          </div>
          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            {contractor.status}
          </span>
        </div>
        <SuperAdminNav />
      </header>

      <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-6">
        <section className="super-admin-card space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-cyan-200" />
                <span>{contractor.email}</span>
              </div>
              {contractor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-cyan-200" />
                  <span>{contractor.phone}</span>
                </div>
              )}
              {client && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <User className="h-4 w-4 text-cyan-200" />
                  <span>{client.business_name || client.full_name || 'Client account'}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-slate-400">
              Joined {new Date(contractor.created_at).toLocaleDateString()}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Assignments', value: teams.length },
            { label: 'Total Paid', value: formatCurrency(metrics.totalPaid) },
            { label: 'Outstanding', value: formatCurrency(metrics.outstanding) },
          ].map(card => (
            <div key={card.label} className="super-admin-card">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
              <p className="text-2xl font-semibold mt-3">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="super-admin-card space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-semibold">Assignments</h2>
            </div>
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-400">No assignments found.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map(assignment => (
                  <div key={assignment.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{assignment.projectName}</p>
                        <p className="text-xs text-slate-400">{assignment.clientName}</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{assignment.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                      <span>Expected {formatCurrency(assignment.expected)}</span>
                      <span>Paid {formatCurrency(assignment.paid)}</span>
                      <span>Balance {formatCurrency(assignment.balance)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="super-admin-card space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-semibold">Recent Payments</h2>
            </div>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded.</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map(payment => (
                  <div key={payment.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{formatCurrency(Number(payment.amount_paid || 0))}</p>
                      <p className="text-xs text-slate-400">{payment.payment_method}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(payment.payment_date).toLocaleDateString()}</span>
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
