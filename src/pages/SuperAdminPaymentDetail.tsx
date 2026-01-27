import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, CreditCard, User, Calendar, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';
import { toast } from 'sonner';

interface PaymentRow {
  id: string;
  project_id: string;
  contractor_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  created_at: string;
  user_id: string;
  recorded_by: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  status: string;
  total_budget: number;
  user_id: string;
}

interface ContractorRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

interface ProfileRow {
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  email: string | null;
}

export function SuperAdminPaymentDetail() {
  const { paymentId } = useParams();
  const { userRole } = useAuth();
  const { formatCurrency } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [contractor, setContractor] = useState<ContractorRow | null>(null);
  const [client, setClient] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (userRole === 'admin' && paymentId) {
      fetchPayment(paymentId);
    }
  }, [paymentId, userRole]);

  const fetchPayment = async (id: string) => {
    setLoading(true);
    const { data: paymentData, error } = await supabase
      .from('payments')
      .select('id, project_id, contractor_id, amount_paid, payment_date, payment_method, reference, created_at, user_id, recorded_by')
      .eq('id', id)
      .single();

    if (error || !paymentData) {
      toast.error('Unable to load payment record.');
      setLoading(false);
      return;
    }

    const [projectRes, contractorRes, clientRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, client_name, status, total_budget, user_id')
        .eq('id', paymentData.project_id)
        .single(),
      supabase
        .from('contractors')
        .select('id, full_name, email, role, status')
        .eq('id', paymentData.contractor_id)
        .single(),
      supabase
        .from('profiles')
        .select('user_id, business_name, full_name, email')
        .eq('user_id', paymentData.user_id)
        .single(),
    ]);

    setPayment(paymentData);
    setProject(projectRes.data || null);
    setContractor(contractorRes.data || null);
    setClient(clientRes.data || null);
    setLoading(false);
  };

  if (loading) {
    return (
      <SuperAdminShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3 animate-fade-in">
            <div className="super-admin-pill mx-auto">Loading Payment</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Fetching payment details...</p>
          </div>
        </div>
      </SuperAdminShell>
    );
  }

  if (!payment) {
    return (
      <SuperAdminShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3">
            <p className="text-sm text-slate-300">Payment record not found.</p>
            <Link to="/super-admin/payments" className="text-cyan-200 hover:text-cyan-100 text-sm">
              Return to payments
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
            <Link to="/super-admin/payments" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
              <ArrowLeft className="h-4 w-4" />
              Back to payments
            </Link>
            <div className="super-admin-pill">
              <CreditCard className="h-3.5 w-3.5 text-cyan-200" />
              Payment Detail
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold">
              {formatCurrency(Number(payment.amount_paid || 0))}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base">
              {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
            </p>
          </div>
          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            {payment.reference || 'No reference'}
          </span>
        </div>
        <SuperAdminNav />
      </header>

      <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Amount Paid', value: formatCurrency(Number(payment.amount_paid || 0)) },
            { label: 'Payment Method', value: payment.payment_method },
            { label: 'Recorded', value: new Date(payment.created_at).toLocaleDateString() },
          ].map(card => (
            <div key={card.label} className="super-admin-card">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
              <p className="text-2xl font-semibold mt-3">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="super-admin-card space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-semibold">Project</h2>
            </div>
            {project ? (
              <>
                <p className="text-sm font-semibold">{project.name}</p>
                <p className="text-xs text-slate-400">{project.client_name}</p>
                <p className="text-xs text-slate-500 mt-2">Status: {project.status}</p>
                <p className="text-xs text-slate-500">Budget: {formatCurrency(Number(project.total_budget || 0))}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Project details unavailable.</p>
            )}
          </div>

          <div className="super-admin-card space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-semibold">Contractor</h2>
            </div>
            {contractor ? (
              <>
                <p className="text-sm font-semibold">{contractor.full_name}</p>
                <p className="text-xs text-slate-400">{contractor.email}</p>
                <p className="text-xs text-slate-500 mt-2">{contractor.role}</p>
                <p className="text-xs text-slate-500">Status: {contractor.status}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Contractor details unavailable.</p>
            )}
          </div>

          <div className="super-admin-card space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-semibold">Client</h2>
            </div>
            {client ? (
              <>
                <p className="text-sm font-semibold">{client.business_name || client.full_name || 'Client account'}</p>
                <p className="text-xs text-slate-400">{client.email || 'No email'}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Client details unavailable.</p>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
              <Calendar className="h-4 w-4" />
              {new Date(payment.payment_date).toLocaleDateString()}
            </div>
          </div>
        </section>
      </main>
    </SuperAdminShell>
  );
}
