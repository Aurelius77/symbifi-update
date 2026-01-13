import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Payment as PaymentType, PaymentMethod } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { format, isThisMonth } from 'date-fns';

export function Payments() {
  const { projects, contractors, payments, addPayment, updatePayment, deletePayment } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<'all' | 'thisMonth'>('all');

  const [formData, setFormData] = useState({
    projectId: '',
    contractorId: '',
    amountPaid: '',
    paymentMethod: 'Bank Transfer' as PaymentMethod,
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    recordedBy: '',
  });

  const resetForm = () => {
    setFormData({
      projectId: '',
      contractorId: '',
      amountPaid: '',
      paymentMethod: 'Bank Transfer',
      paymentDate: new Date().toISOString().split('T')[0],
      reference: '',
      recordedBy: '',
    });
    setEditingPayment(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paymentData: PaymentType = {
      id: editingPayment?.id || `PAY-${Date.now().toString(36).toUpperCase()}`,
      projectId: formData.projectId,
      contractorId: formData.contractorId,
      amountPaid: parseFloat(formData.amountPaid) || 0,
      paymentMethod: formData.paymentMethod,
      paymentDate: formData.paymentDate,
      reference: formData.reference,
      recordedBy: formData.recordedBy,
    };

    if (editingPayment) {
      updatePayment(editingPayment.id, paymentData);
    } else {
      addPayment(paymentData);
    }
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (payment: PaymentType) => {
    setEditingPayment(payment);
    setFormData({
      projectId: payment.projectId,
      contractorId: payment.contractorId,
      amountPaid: payment.amountPaid.toString(),
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      reference: payment.reference,
      recordedBy: payment.recordedBy,
    });
    setIsOpen(true);
  };

  const filteredPayments = payments.filter((payment) => {
    const project = projects.find(p => p.id === payment.projectId);
    const contractor = contractors.find(c => c.id === payment.contractorId);
    const matchesSearch = project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || payment.projectId === projectFilter;
    const matchesMonth = monthFilter === 'all' || isThisMonth(new Date(payment.paymentDate));
    return matchesSearch && matchesProject && matchesMonth;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalFiltered = filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-description">Record and track all contractor payments</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingPayment ? 'Edit Payment' : 'Record New Payment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractorId">Contractor</Label>
                  <Select
                    value={formData.contractorId}
                    onValueChange={(value) => setFormData({ ...formData, contractorId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contractor" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractors.map((contractor) => (
                        <SelectItem key={contractor.id} value={contractor.id}>{contractor.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Amount Paid (₦)</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: PaymentMethod) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="USSD">USSD</SelectItem>
                      <SelectItem value="Wallet">Wallet</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recordedBy">Recorded By</Label>
                  <Input
                    id="recordedBy"
                    value={formData.recordedBy}
                    onChange={(e) => setFormData({ ...formData, recordedBy: e.target.value })}
                    placeholder="Your name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference / Notes</Label>
                <Textarea
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Transaction reference, notes..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPayment ? 'Update' : 'Record'} Payment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={(value: 'all' | 'thisMonth') => setMonthFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium">Total for current filter:</span>
        <span className="text-xl font-bold text-primary">{formatCurrency(totalFiltered)}</span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No payments found. Record your first payment to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Project</th>
                  <th>Contractor</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Recorded By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const project = projects.find(p => p.id === payment.projectId);
                  const contractor = contractors.find(c => c.id === payment.contractorId);
                  
                  return (
                    <tr key={payment.id}>
                      <td className="font-mono text-sm">{payment.id}</td>
                      <td className="font-medium">{project?.name || 'Unknown'}</td>
                      <td>{contractor?.fullName || 'Unknown'}</td>
                      <td className="font-semibold text-primary">{formatCurrency(payment.amountPaid)}</td>
                      <td>
                        <span className="badge-status badge-active">{payment.paymentMethod}</span>
                      </td>
                      <td className="text-muted-foreground">
                        {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                      </td>
                      <td className="text-muted-foreground">{payment.recordedBy || '-'}</td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deletePayment(payment.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
