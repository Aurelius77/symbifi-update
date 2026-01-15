import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Download, PieChart, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csv-export';

interface PaymentSummaryData {
  contractor_id: string;
  contractor_name: string;
  total_agreed: number;
  total_paid: number;
  balance_due: number;
}

interface PaymentStatusSummary {
  status: string;
  count: number;
  total_amount: number;
}

export function PaymentSummary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<PaymentSummaryData[]>([]);
  const [statusSummaries, setStatusSummaries] = useState<PaymentStatusSummary[]>([]);
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

    // Contractor payment summary
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

    // Payment status summary across all project assignments
    const statusMap = new Map<string, PaymentStatusSummary>();
    ['Unpaid', 'Partial', 'Paid'].forEach(status => {
      statusMap.set(status, { status, count: 0, total_amount: 0 });
    });

    teams.forEach(team => {
      const project = projects.find(p => p.id === team.project_id);
      if (!project) return;
      
      const calculatedPay = team.payment_type === 'Fixed Amount' 
        ? Number(team.agreed_amount) 
        : (Number(project.total_budget) * Number(team.percentage_share)) / 100;
      
      const statusData = statusMap.get(team.payment_status);
      if (statusData) {
        statusData.count += 1;
        statusData.total_amount += calculatedPay;
      }
    });

    setStatusSummaries(Array.from(statusMap.values()));
    setLoading(false);
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const handleExportContractorSummary = () => {
    const exportData = filtered.map(s => ({
      contractor_name: s.contractor_name,
      total_agreed: formatCurrencyForCSV(s.total_agreed),
      total_paid: formatCurrencyForCSV(s.total_paid),
      balance_due: formatCurrencyForCSV(s.balance_due),
    }));

    exportToCSV(exportData, `contractor-summary-${new Date().toISOString().split('T')[0]}`, {
      contractor_name: 'Contractor',
      total_agreed: 'Total Agreed (NGN)',
      total_paid: 'Total Paid (NGN)',
      balance_due: 'Balance Due (NGN)',
    });

    toast({ title: 'Contractor summary exported to CSV' });
  };

  const handleExportStatusSummary = () => {
    const exportData = statusSummaries.map(s => ({
      status: s.status,
      count: s.count,
      total_amount: formatCurrencyForCSV(s.total_amount),
    }));

    exportToCSV(exportData, `payment-status-summary-${new Date().toISOString().split('T')[0]}`, {
      status: 'Payment Status',
      count: 'Number of Assignments',
      total_amount: 'Total Amount (NGN)',
    });

    toast({ title: 'Payment status summary exported to CSV' });
  };

  const filtered = summaries.filter(s => s.contractor_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totals = filtered.reduce((acc, s) => ({ 
    agreed: acc.agreed + s.total_agreed, 
    paid: acc.paid + s.total_paid, 
    balance: acc.balance + s.balance_due 
  }), { agreed: 0, paid: 0, balance: 0 });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'Partial': return <TrendingUp className="w-5 h-5 text-warning" />;
      default: return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Partial': return 'secondary';
      default: return 'destructive';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Payment Summary</h1>
          <p className="page-description">Overview of contractor payments and assignment statuses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleExportContractorSummary} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" /> Export Summary
          </Button>
          <Button onClick={handleExportStatusSummary} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" /> Export Status
          </Button>
        </div>
      </div>

      {/* Payment Status Summary Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          Assignment Payment Status Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statusSummaries.map((s) => (
            <Card key={s.status}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{s.status}</span>
                  <Badge variant={getStatusVariant(s.status)}>{s.count}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {getStatusIcon(s.status)}
                  <div>
                    <p className="text-lg sm:text-xl font-bold">{formatCurrency(s.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">{s.count} assignment{s.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="relative max-w-full sm:max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search contractors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>
      
      {/* Contractor Summary Cards */}
      <h2 className="text-lg font-semibold mb-4">Contractor Payment Overview</h2>
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
