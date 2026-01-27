import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { exportToCSV, formatCurrencyForCSV, formatDateForCSV } from '@/lib/csv-export';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';

interface PaymentRow {
  id: string;
  project_id: string;
  contractor_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  created_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
}

interface ContractorRow {
  id: string;
  full_name: string;
}

export function SuperAdminPayments() {
  const { userRole } = useAuth();
  const { formatCurrency } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [contractors, setContractors] = useState<ContractorRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    if (userRole === 'admin') {
      fetchPayments();
    }
  }, [userRole]);

  const fetchPayments = async () => {
    setLoading(true);
    const [paymentsRes, projectsRes, contractorsRes] = await Promise.all([
      supabase.from('payments').select('id, project_id, contractor_id, amount_paid, payment_date, payment_method, created_at'),
      supabase.from('projects').select('id, name, client_name'),
      supabase.from('contractors').select('id, full_name'),
    ]);

    if (paymentsRes.error || projectsRes.error || contractorsRes.error) {
      toast.error('Failed to load payment history.');
      setLoading(false);
      return;
    }

    setPayments(paymentsRes.data || []);
    setProjects(projectsRes.data || []);
    setContractors(contractorsRes.data || []);
    setLoading(false);
  };

  const projectById = useMemo(() => new Map(projects.map(project => [project.id, project])), [projects]);
  const contractorById = useMemo(() => new Map(contractors.map(contractor => [contractor.id, contractor])), [contractors]);

  const methods = useMemo(() => {
    const unique = new Set(payments.map(payment => payment.payment_method).filter(Boolean));
    return Array.from(unique);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return payments.filter(payment => {
      const project = projectById.get(payment.project_id);
      const contractor = contractorById.get(payment.contractor_id);
      const matchesSearch =
        project?.name?.toLowerCase().includes(term) ||
        contractor?.full_name?.toLowerCase().includes(term) ||
        payment.payment_method?.toLowerCase().includes(term);
      const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [payments, projectById, contractorById, searchTerm, methodFilter]);

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

  const handleExport = () => {
    if (payments.length === 0) {
      toast.error('No payments to export.');
      return;
    }

    const exportData = payments.map(payment => {
      const project = projectById.get(payment.project_id);
      const contractor = contractorById.get(payment.contractor_id);
      return {
        payment_date: formatDateForCSV(payment.payment_date),
        amount_paid: formatCurrencyForCSV(Number(payment.amount_paid || 0)),
        payment_method: payment.payment_method,
        project: project?.name || payment.project_id,
        contractor: contractor?.full_name || payment.contractor_id,
      };
    });

    exportToCSV(exportData, `super-admin-payments-${new Date().toISOString().split('T')[0]}`, {
      payment_date: 'Payment Date',
      amount_paid: 'Amount Paid',
      payment_method: 'Method',
      project: 'Project',
      contractor: 'Contractor',
    });
    toast.success('Payment history exported.');
  };

  return (
    <SuperAdminShell>
      <header className="px-6 pt-8 pb-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="super-admin-pill">
              <CreditCard className="h-3.5 w-3.5 text-cyan-200" />
              Payout Operations
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold">Payment History</h1>
            <p className="text-slate-300 max-w-2xl text-sm sm:text-base">
              Review every payment, method, and payout event across all clients.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
              onClick={fetchPayments}
            >
              Refresh Payments
            </Button>
            <Button
              className="rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300"
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </div>
        </div>
        <div className="mt-6">
          <SuperAdminNav />
        </div>
      </header>

      <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-6">
        {loading ? (
          <div className="super-admin-card w-full text-center space-y-3">
            <div className="super-admin-pill mx-auto">Loading Payments</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Fetching payment records...</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Total Payments', value: payments.length },
                { label: 'Total Paid', value: formatCurrency(totalPaid) },
                { label: 'Unique Methods', value: methods.length },
              ].map(card => (
                <div key={card.label} className="super-admin-card">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
                  <p className="text-2xl font-semibold mt-3">{card.value}</p>
                </div>
              ))}
            </section>

            <section className="super-admin-card space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Payments Ledger</h2>
                  <p className="text-xs text-slate-400 mt-1">Search by project, contractor, or method.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-72">
                    <Input
                      placeholder="Search payments..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="bg-slate-950/40 border-slate-700/70 text-slate-100 placeholder:text-slate-500 pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-full sm:w-48 bg-slate-950/40 border-slate-700/70 text-slate-100">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {methods.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredPayments.length === 0 ? (
                <p className="text-sm text-slate-400">No payments match your filters.</p>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map(payment => {
                    const project = projectById.get(payment.project_id);
                    const contractor = contractorById.get(payment.contractor_id);
                    return (
                      <div
                        key={payment.id}
                        className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold">{formatCurrency(Number(payment.amount_paid || 0))}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {project?.name || payment.project_id} • {contractor?.full_name || payment.contractor_id}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{payment.payment_method}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </span>
                          <Link to={`/super-admin/payments/${payment.id}`}>
                            <Button
                              variant="outline"
                              className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                            >
                              View
                            </Button>
                          </Link>
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
