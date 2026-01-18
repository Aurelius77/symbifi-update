import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Plus, Search, Edit2, Trash2, CreditCard, Calendar, Building, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-export';

interface Project {
  id: string;
  name: string;
}

interface Contractor {
  id: string;
  full_name: string;
}

interface Payment {
  id: string;
  project_id: string;
  contractor_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  recorded_by: string | null;
  user_id: string;
}

export function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency, getCurrencySymbol, profile } = useUserProfile();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    contractor_id: '',
    amount_paid: 0,
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'Bank Transfer',
    reference: '',
    recorded_by: '',
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [paymentsRes, projectsRes, contractorsRes] = await Promise.all([
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('projects').select('*'),
      supabase.from('contractors').select('*'),
    ]);

    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (contractorsRes.data) setContractors(contractorsRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      ...formData,
      reference: formData.reference || null,
      recorded_by: formData.recorded_by || null,
      user_id: user.id,
    };

    let error;
    if (editingPayment) {
      ({ error } = await supabase.from('payments').update(payload).eq('id', editingPayment.id));
    } else {
      ({ error } = await supabase.from('payments').insert(payload));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingPayment ? 'Payment updated' : 'Payment recorded' });
      fetchData();
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Payment deleted' });
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      contractor_id: '',
      amount_paid: 0,
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'Bank Transfer',
      reference: '',
      recorded_by: '',
    });
    setEditingPayment(null);
    setDialogOpen(false);
  };

  const openEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      project_id: payment.project_id,
      contractor_id: payment.contractor_id,
      amount_paid: payment.amount_paid,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference: payment.reference || '',
      recorded_by: payment.recorded_by || '',
    });
    setDialogOpen(true);
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getContractorName = (id: string) => contractors.find(c => c.id === id)?.full_name || 'Unknown';

  const filtered = payments.filter(p => {
    const matchesSearch =
      getContractorName(p.contractor_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProjectName(p.project_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesProject = filterProject === 'all' || p.project_id === filterProject;
    return matchesSearch && matchesProject;
  });

  const totalPayments = filtered.reduce((sum, p) => sum + Number(p.amount_paid), 0);

  const handleExportCSV = () => {
    const exportData = filtered.map(p => ({
      date: formatDateForCSV(p.payment_date),
      contractor: getContractorName(p.contractor_id),
      project: getProjectName(p.project_id),
      amount: formatCurrencyForCSV(p.amount_paid),
      method: p.payment_method,
      reference: p.reference || '',
      recorded_by: p.recorded_by || '',
    }));

    exportToCSV(exportData, `payments-export-${new Date().toISOString().split('T')[0]}`, {
      date: 'Payment Date',
      contractor: 'Contractor',
      project: 'Project',
      amount: `Amount (${profile.currency})`,
      method: 'Payment Method',
      reference: 'Reference',
      recorded_by: 'Recorded By',
    });

    toast({ title: 'Payments exported to CSV' });
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
          <h1 className="page-title">Payments</h1>
          <p className="page-description">Record and manage contractor payments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPayment ? 'Edit Payment' : 'Record New Payment'}</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={formData.project_id} onValueChange={v => setFormData(f => ({ ...f, project_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contractor</Label>
                  <Select value={formData.contractor_id} onValueChange={v => setFormData(f => ({ ...f, contractor_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select contractor" /></SelectTrigger>
                    <SelectContent>
                      {contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount Paid ({getCurrencySymbol()})</Label>
                  <Input
                    type="number"
                    value={formData.amount_paid}
                    onChange={e => setFormData(f => ({ ...f, amount_paid: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={e => setFormData(f => ({ ...f, payment_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={v => setFormData(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Crypto">Crypto</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reference (Optional)</Label>
                  <Input
                    value={formData.reference}
                    onChange={e => setFormData(f => ({ ...f, reference: e.target.value }))}
                    placeholder="Transaction ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recorded By (Optional)</Label>
                  <Input
                    value={formData.recorded_by}
                    onChange={e => setFormData(f => ({ ...f, recorded_by: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto">{editingPayment ? 'Update' : 'Record'} Payment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-primary/10 rounded-xl p-4 mb-6">
        <p className="text-sm text-muted-foreground">Total Payments (Filtered)</p>
        <p className="text-2xl font-bold text-primary">{formatCurrency(totalPayments)}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Cards / Desktop Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No payments found</h3>
          <p className="text-muted-foreground mb-4">Record your first payment to get started.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Contractor</th>
                  <th>Project</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(payment => (
                  <tr key={payment.id}>
                    <td>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</td>
                    <td className="font-medium">{getContractorName(payment.contractor_id)}</td>
                    <td>{getProjectName(payment.project_id)}</td>
                    <td className="font-semibold text-primary">{formatCurrency(payment.amount_paid)}</td>
                    <td>{payment.payment_method}</td>
                    <td className="text-muted-foreground">{payment.reference || '-'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(payment)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(payment.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden grid gap-4">
            {filtered.map(payment => (
              <div key={payment.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{getContractorName(payment.contractor_id)}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-primary">{formatCurrency(payment.amount_paid)}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>{getProjectName(payment.project_id)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{payment.payment_method}</span>
                    {payment.reference && <span className="ml-2 text-xs">• {payment.reference}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => openEdit(payment)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => handleDelete(payment.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
