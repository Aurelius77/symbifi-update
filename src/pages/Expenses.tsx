import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit2, Trash2, Receipt, Calendar, Building, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-export';

interface Project {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  project_id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  receipt_reference: string | null;
  recorded_by: string | null;
  notes: string | null;
  user_id: string;
}

const EXPENSE_CATEGORIES = [
  'General',
  'Equipment',
  'Materials',
  'Transportation',
  'Accommodation',
  'Meals',
  'Software & Tools',
  'Communication',
  'Marketing',
  'Professional Services',
  'Office Supplies',
  'Utilities',
  'Insurance',
  'Taxes & Fees',
  'Other',
];

export function Expenses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    description: '',
    category: 'General',
    amount: 0,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    receipt_reference: '',
    recorded_by: '',
    notes: '',
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [expensesRes, projectsRes] = await Promise.all([
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('projects').select('*'),
    ]);

    if (expensesRes.data) setExpenses(expensesRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      ...formData,
      receipt_reference: formData.receipt_reference || null,
      recorded_by: formData.recorded_by || null,
      notes: formData.notes || null,
      user_id: user.id,
    };

    let error;
    if (editingExpense) {
      ({ error } = await supabase.from('expenses').update(payload).eq('id', editingExpense.id));
    } else {
      ({ error } = await supabase.from('expenses').insert(payload));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingExpense ? 'Expense updated' : 'Expense recorded' });
      fetchData();
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Expense deleted' });
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      description: '',
      category: 'General',
      amount: 0,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      receipt_reference: '',
      recorded_by: '',
      notes: '',
    });
    setEditingExpense(null);
    setDialogOpen(false);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      project_id: expense.project_id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      expense_date: expense.expense_date,
      receipt_reference: expense.receipt_reference || '',
      recorded_by: expense.recorded_by || '',
      notes: expense.notes || '',
    });
    setDialogOpen(true);
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const filtered = expenses.filter(e => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProjectName(e.project_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.receipt_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesProject = filterProject === 'all' || e.project_id === filterProject;
    const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
    return matchesSearch && matchesProject && matchesCategory;
  });

  const totalExpenses = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  const handleExportCSV = () => {
    const exportData = filtered.map(e => ({
      date: formatDateForCSV(e.expense_date),
      project: getProjectName(e.project_id),
      description: e.description,
      category: e.category,
      amount: formatCurrencyForCSV(e.amount),
      receipt: e.receipt_reference || '',
      recorded_by: e.recorded_by || '',
      notes: e.notes || '',
    }));

    exportToCSV(exportData, `expenses-export-${new Date().toISOString().split('T')[0]}`, {
      date: 'Expense Date',
      project: 'Project',
      description: 'Description',
      category: 'Category',
      amount: 'Amount (NGN)',
      receipt: 'Receipt Reference',
      recorded_by: 'Recorded By',
      notes: 'Notes',
    });

    toast({ title: 'Expenses exported to CSV' });
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
          <h1 className="page-title">Expenses</h1>
          <p className="page-description">Track and manage project expenses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder="What was this expense for?"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₦)</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={e => setFormData(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expense Date</Label>
                    <Input
                      type="date"
                      value={formData.expense_date}
                      onChange={e => setFormData(f => ({ ...f, expense_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt Reference (Optional)</Label>
                    <Input
                      value={formData.receipt_reference}
                      onChange={e => setFormData(f => ({ ...f, receipt_reference: e.target.value }))}
                      placeholder="Receipt number or ID"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recorded By (Optional)</Label>
                  <Input
                    value={formData.recorded_by}
                    onChange={e => setFormData(f => ({ ...f, recorded_by: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">Cancel</Button>
                  <Button type="submit" className="w-full sm:w-auto">{editingExpense ? 'Update' : 'Add'} Expense</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-destructive/10 rounded-xl p-4 mb-6">
        <p className="text-sm text-muted-foreground">Total Expenses (Filtered)</p>
        <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
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
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Cards / Desktop Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
          <p className="text-muted-foreground mb-4">Add your first expense to get started.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Receipt</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(expense => (
                  <tr key={expense.id}>
                    <td>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</td>
                    <td>{getProjectName(expense.project_id)}</td>
                    <td className="font-medium max-w-xs truncate">{expense.description}</td>
                    <td><span className="badge-status bg-muted text-muted-foreground">{expense.category}</span></td>
                    <td className="font-semibold text-destructive">{formatCurrency(expense.amount)}</td>
                    <td className="text-muted-foreground">{expense.receipt_reference || '-'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(expense)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(expense.id)}>
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
            {filtered.map(expense => (
              <div key={expense.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{expense.description}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(expense.amount)}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>{getProjectName(expense.project_id)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-sm">
                    <span className="badge-status bg-muted text-muted-foreground">{expense.category}</span>
                    {expense.receipt_reference && <span className="ml-2 text-xs text-muted-foreground">• {expense.receipt_reference}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => openEdit(expense)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => handleDelete(expense.id)}>
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
