import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Plus, Pencil, Trash2, Search, User } from 'lucide-react';
import { toast } from 'sonner';

type ContractorType = 'Individual' | 'Agency';
type ContractorStatus = 'Active' | 'Inactive';

interface Contractor {
  id: string;
  full_name: string;
  role: string;
  email: string;
  phone: string | null;
  bank_wallet_details: string | null;
  contractor_type: string;
  status: string;
}

export function Contractors() {
  const { user } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractorStatus | 'all'>('all');

  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    email: '',
    phone: '',
    bank_wallet_details: '',
    contractor_type: 'Individual' as ContractorType,
    status: 'Active' as ContractorStatus,
  });

  useEffect(() => {
    if (user) fetchContractors();
  }, [user]);

  const fetchContractors = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('contractors').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load contractors');
    } else {
      setContractors(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      role: '',
      email: '',
      phone: '',
      bank_wallet_details: '',
      contractor_type: 'Individual',
      status: 'Active',
    });
    setEditingContractor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const contractorData = {
      user_id: user!.id,
      full_name: formData.full_name,
      role: formData.role,
      email: formData.email,
      phone: formData.phone || null,
      bank_wallet_details: formData.bank_wallet_details || null,
      contractor_type: formData.contractor_type,
      status: formData.status,
    };

    if (editingContractor) {
      const { error } = await supabase.from('contractors').update(contractorData).eq('id', editingContractor.id);
      if (error) {
        toast.error('Failed to update contractor');
      } else {
        toast.success('Contractor updated');
        fetchContractors();
      }
    } else {
      const { error } = await supabase.from('contractors').insert(contractorData);
      if (error) {
        toast.error('Failed to create contractor');
      } else {
        toast.success('Contractor added');
        fetchContractors();
      }
    }
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      full_name: contractor.full_name,
      role: contractor.role,
      email: contractor.email,
      phone: contractor.phone || '',
      bank_wallet_details: contractor.bank_wallet_details || '',
      contractor_type: contractor.contractor_type as ContractorType,
      status: contractor.status as ContractorStatus,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('contractors').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete contractor');
    } else {
      toast.success('Contractor deleted');
      fetchContractors();
    }
  };

  const filteredContractors = contractors.filter((contractor) => {
    const matchesSearch = contractor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contractor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Contractors</h1>
          <p className="page-description">Manage your team of contractors and collaborators</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Contractor</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingContractor ? 'Edit Contractor' : 'Add New Contractor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role / Skill</Label>
                  <Input id="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractor_type">Contractor Type</Label>
                  <Select value={formData.contractor_type} onValueChange={(value: ContractorType) => setFormData({ ...formData, contractor_type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: ContractorStatus) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_wallet_details">Bank / Wallet Details</Label>
                <Textarea id="bank_wallet_details" value={formData.bank_wallet_details} onChange={(e) => setFormData({ ...formData, bank_wallet_details: e.target.value })} placeholder="Bank name, account number, wallet address..." rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit">{editingContractor ? 'Update' : 'Create'} Contractor</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search contractors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(value: ContractorStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredContractors.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No contractors found. Add your first contractor to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContractors.map((contractor) => (
            <div key={contractor.id} className="bg-card rounded-xl border border-border p-5 animate-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{contractor.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{contractor.role}</p>
                  </div>
                </div>
                <span className={`badge-status ${contractor.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                  {contractor.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{contractor.email}</p>
                {contractor.phone && <p className="text-muted-foreground">{contractor.phone}</p>}
                <p className="text-xs text-muted-foreground/70">{contractor.contractor_type}</p>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => handleEdit(contractor)} className="flex-1">
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(contractor.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
