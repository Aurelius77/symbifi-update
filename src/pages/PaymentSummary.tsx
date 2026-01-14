import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PaymentSummaryData {
  contractor_id: string;
  contractor_name: string;
  total_agreed: number;
  total_paid: number;
  balance_due: number;
}

export function PaymentSummary() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<PaymentSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) fetchSummary();
  }, [user]);

  const fetchSummary = async () => {
    setLoading(true);
    const [projectsRes, contractorsRes, teamsRes, paymentsRes] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('contractors').select('*'),
      supabase.from('project_teams').select('*'),
      supabase.from('payments').select('*'),
    ]);

    const projects = projectsRes.data || [];
    const contractors = contractorsRes.data || [];
    const teams = teamsRes.data || [];
    const payments = paymentsRes.data || [];

    const summaryMap = new Map<string, PaymentSummaryData>();

    contractors.forEach(c => {
      summaryMap.set(c.id, {
        contractor_id: c.id,
        contractor_name: c.full_name,
        total_agreed: 0,
        total_paid: 0,
        balance_due: 0,
      });
    });

    teams.forEach(team => {
      const project = projects.find(p => p.id === team.project_id);
      if (!project) return;
      
      const pay = team.payment_type === 'Fixed Amount' 
        ? Number(team.agreed_amount) 
        : (Number(project.total_budget) * Number(team.percentage_share)) / 100;
      
      const summary = summaryMap.get(team.contractor_id);
      if (summary) summary.total_agreed += pay;
    });

    payments.forEach(payment => {
      const summary = summaryMap.get(payment.contractor_id);
      if (summary) summary.total_paid += Number(payment.amount_paid);
    });

    summaryMap.forEach(s => s.balance_due = s.total_agreed - s.total_paid);
    setSummaries(Array.from(summaryMap.values()).filter(s => s.total_agreed > 0 || s.total_paid > 0));
    setLoading(false);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const filtered = summaries.filter(s => s.contractor_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totals = filtered.reduce((acc, s) => ({ agreed: acc.agreed + s.total_agreed, paid: acc.paid + s.total_paid, balance: acc.balance + s.balance_due }), { agreed: 0, paid: 0, balance: 0 });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Payment Summary</h1>
        <p className="page-description">Overview of contractor payments across all projects</p>
      </div>
      
      <div className="relative max-w-full sm:max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search contractors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/50 p-4 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold">{formatCurrency(totals.agreed)}</p>
          <p className="text-sm text-muted-foreground">Total Agreed</p>
        </div>
        <div className="bg-success/10 p-4 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-success">{formatCurrency(totals.paid)}</p>
          <p className="text-sm text-muted-foreground">Total Paid</p>
        </div>
        <div className="bg-warning/10 p-4 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-warning">{formatCurrency(totals.balance)}</p>
          <p className="text-sm text-muted-foreground">Balance Due</p>
        </div>
      </div>
      
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No payment data found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contractor</th>
                  <th>Total Agreed Pay</th>
                  <th>Total Paid</th>
                  <th>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.contractor_id}>
                    <td className="font-medium">{s.contractor_name}</td>
                    <td>{formatCurrency(s.total_agreed)}</td>
                    <td className="text-success">{formatCurrency(s.total_paid)}</td>
                    <td className={s.balance_due > 0 ? 'text-warning font-medium' : 'text-success'}>{formatCurrency(s.balance_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Cards */}
          <div className="lg:hidden grid gap-4">
            {filtered.map((s) => (
              <div key={s.contractor_id} className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-3">{s.contractor_name}</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Agreed</p>
                    <p className="font-semibold text-sm">{formatCurrency(s.total_agreed)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-semibold text-sm text-success">{formatCurrency(s.total_paid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className={`font-semibold text-sm ${s.balance_due > 0 ? 'text-warning' : 'text-success'}`}>{formatCurrency(s.balance_due)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
