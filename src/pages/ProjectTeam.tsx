import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { ProjectTeam as ProjectTeamType, PaymentType, PaymentStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function ProjectTeam() {
  const { projects, contractors, projectTeams, addProjectTeam, updateProjectTeam, deleteProjectTeam, getCalculatedPay, getTotalPaidForTeam } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ProjectTeamType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');

  const [formData, setFormData] = useState({
    projectId: '',
    contractorId: '',
    responsibility: '',
    paymentType: 'Fixed Amount' as PaymentType,
    agreedAmount: '',
    percentageShare: '',
    paymentStatus: 'Unpaid' as PaymentStatus,
  });

  const resetForm = () => {
    setFormData({
      projectId: '',
      contractorId: '',
      responsibility: '',
      paymentType: 'Fixed Amount',
      agreedAmount: '',
      percentageShare: '',
      paymentStatus: 'Unpaid',
    });
    setEditingTeam(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const teamData: ProjectTeamType = {
      id: editingTeam?.id || crypto.randomUUID(),
      projectId: formData.projectId,
      contractorId: formData.contractorId,
      responsibility: formData.responsibility,
      paymentType: formData.paymentType,
      agreedAmount: parseFloat(formData.agreedAmount) || 0,
      percentageShare: parseFloat(formData.percentageShare) || 0,
      paymentStatus: formData.paymentStatus,
    };

    if (editingTeam) {
      updateProjectTeam(editingTeam.id, teamData);
    } else {
      addProjectTeam(teamData);
    }
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (team: ProjectTeamType) => {
    setEditingTeam(team);
    setFormData({
      projectId: team.projectId,
      contractorId: team.contractorId,
      responsibility: team.responsibility,
      paymentType: team.paymentType,
      agreedAmount: team.agreedAmount.toString(),
      percentageShare: team.percentageShare.toString(),
      paymentStatus: team.paymentStatus,
    });
    setIsOpen(true);
  };

  const filteredTeams = projectTeams.filter((team) => {
    const project = projects.find(p => p.id === team.projectId);
    const contractor = contractors.find(c => c.id === team.contractorId);
    const matchesSearch = project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.responsibility.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || team.projectId === projectFilter;
    const matchesStatus = statusFilter === 'all' || team.paymentStatus === statusFilter;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const styles = {
      'Unpaid': 'badge-status badge-unpaid',
      'Partially Paid': 'badge-status badge-partial',
      'Paid': 'badge-status badge-paid',
    };
    return <span className={styles[status]}>{status}</span>;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Project Team</h1>
          <p className="page-description">Assign contractors to projects and track payment agreements</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTeam ? 'Edit Assignment' : 'Add New Assignment'}</DialogTitle>
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
              <div className="space-y-2">
                <Label htmlFor="responsibility">Responsibility / Task Description</Label>
                <Input
                  id="responsibility"
                  value={formData.responsibility}
                  onChange={(e) => setFormData({ ...formData, responsibility: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(value: PaymentType) => setFormData({ ...formData, paymentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fixed Amount">Fixed Amount</SelectItem>
                      <SelectItem value="Percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={formData.paymentStatus}
                    onValueChange={(value: PaymentStatus) => setFormData({ ...formData, paymentStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.paymentType === 'Fixed Amount' ? (
                <div className="space-y-2">
                  <Label htmlFor="agreedAmount">Agreed Amount (₦)</Label>
                  <Input
                    id="agreedAmount"
                    type="number"
                    value={formData.agreedAmount}
                    onChange={(e) => setFormData({ ...formData, agreedAmount: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="percentageShare">Percentage Share (%)</Label>
                  <Input
                    id="percentageShare"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.percentageShare}
                    onChange={(e) => setFormData({ ...formData, percentageShare: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTeam ? 'Update' : 'Create'} Assignment
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
            placeholder="Search assignments..."
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
        <Select value={statusFilter} onValueChange={(value: PaymentStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Unpaid">Unpaid</SelectItem>
            <SelectItem value="Partially Paid">Partially Paid</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filteredTeams.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No assignments found. Add a project and contractor first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Contractor</th>
                  <th>Responsibility</th>
                  <th>Payment Type</th>
                  <th>Calculated Pay</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => {
                  const project = projects.find(p => p.id === team.projectId);
                  const contractor = contractors.find(c => c.id === team.contractorId);
                  const calculatedPay = getCalculatedPay(team);
                  const totalPaid = getTotalPaidForTeam(team.projectId, team.contractorId);
                  const balance = calculatedPay - totalPaid;
                  
                  return (
                    <tr key={team.id}>
                      <td className="font-medium">{project?.name || 'Unknown'}</td>
                      <td>{contractor?.fullName || 'Unknown'}</td>
                      <td className="text-muted-foreground max-w-[200px] truncate">{team.responsibility}</td>
                      <td>
                        {team.paymentType === 'Fixed Amount' 
                          ? `Fixed: ${formatCurrency(team.agreedAmount)}`
                          : `${team.percentageShare}% of budget`
                        }
                      </td>
                      <td className="font-semibold text-primary">{formatCurrency(calculatedPay)}</td>
                      <td className="text-success">{formatCurrency(totalPaid)}</td>
                      <td className={balance > 0 ? 'text-warning font-medium' : 'text-success'}>
                        {formatCurrency(balance)}
                      </td>
                      <td>{getStatusBadge(team.paymentStatus)}</td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(team)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteProjectTeam(team.id)}>
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
