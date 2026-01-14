import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit2, Trash2, UserCheck, Briefcase, DollarSign, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: string;
  name: string;
  total_budget: number;
}

interface Contractor {
  id: string;
  full_name: string;
}

interface ProjectTeam {
  id: string;
  project_id: string;
  contractor_id: string;
  responsibility: string;
  payment_type: string;
  agreed_amount: number;
  percentage_share: number;
  payment_status: string;
  user_id: string;
}

export function ProjectTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<ProjectTeam[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ProjectTeam | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    contractor_id: '',
    responsibility: '',
    payment_type: 'Fixed Amount',
    agreed_amount: 0,
    percentage_share: 0,
    payment_status: 'Unpaid',
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [teamsRes, projectsRes, contractorsRes] = await Promise.all([
      supabase.from('project_teams').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('contractors').select('*'),
    ]);

    if (teamsRes.data) setTeams(teamsRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (contractorsRes.data) setContractors(contractorsRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      ...formData,
      user_id: user.id,
    };

    let error;
    if (editingTeam) {
      ({ error } = await supabase.from('project_teams').update(payload).eq('id', editingTeam.id));
    } else {
      ({ error } = await supabase.from('project_teams').insert(payload));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingTeam ? 'Team assignment updated' : 'Team member added' });
      fetchData();
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('project_teams').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team assignment deleted' });
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      contractor_id: '',
      responsibility: '',
      payment_type: 'Fixed Amount',
      agreed_amount: 0,
      percentage_share: 0,
      payment_status: 'Unpaid',
    });
    setEditingTeam(null);
    setDialogOpen(false);
  };

  const openEdit = (team: ProjectTeam) => {
    setEditingTeam(team);
    setFormData({
      project_id: team.project_id,
      contractor_id: team.contractor_id,
      responsibility: team.responsibility,
      payment_type: team.payment_type,
      agreed_amount: team.agreed_amount,
      percentage_share: team.percentage_share,
      payment_status: team.payment_status,
    });
    setDialogOpen(true);
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getContractorName = (id: string) => contractors.find(c => c.id === id)?.full_name || 'Unknown';
  const getProjectBudget = (id: string) => projects.find(p => p.id === id)?.total_budget || 0;

  const getCalculatedPay = (team: ProjectTeam) => {
    if (team.payment_type === 'Fixed Amount') return team.agreed_amount;
    return (getProjectBudget(team.project_id) * team.percentage_share) / 100;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const filtered = teams.filter(t => {
    const matchesSearch =
      getContractorName(t.contractor_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProjectName(t.project_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.responsibility.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === 'all' || t.project_id === filterProject;
    return matchesSearch && matchesProject;
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
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Project Team</h1>
          <p className="page-description">Manage contractor assignments and payment terms</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTeam ? 'Edit Assignment' : 'Add Team Assignment'}</DialogTitle>
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
              <div className="space-y-2">
                <Label>Responsibility</Label>
                <Input
                  value={formData.responsibility}
                  onChange={e => setFormData(f => ({ ...f, responsibility: e.target.value }))}
                  placeholder="e.g., Lead Developer"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select value={formData.payment_type} onValueChange={v => setFormData(f => ({ ...f, payment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fixed Amount">Fixed Amount</SelectItem>
                      <SelectItem value="Percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.payment_type === 'Fixed Amount' ? (
                  <div className="space-y-2">
                    <Label>Agreed Amount (₦)</Label>
                    <Input
                      type="number"
                      value={formData.agreed_amount}
                      onChange={e => setFormData(f => ({ ...f, agreed_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Percentage Share (%)</Label>
                    <Input
                      type="number"
                      value={formData.percentage_share}
                      onChange={e => setFormData(f => ({ ...f, percentage_share: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={v => setFormData(f => ({ ...f, payment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto">{editingTeam ? 'Update' : 'Add'} Assignment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
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
          <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No assignments found</h3>
          <p className="text-muted-foreground mb-4">Add contractors to your projects to get started.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contractor</th>
                  <th>Project</th>
                  <th>Responsibility</th>
                  <th>Payment Terms</th>
                  <th>Calculated Pay</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(team => (
                  <tr key={team.id}>
                    <td className="font-medium">{getContractorName(team.contractor_id)}</td>
                    <td>{getProjectName(team.project_id)}</td>
                    <td>{team.responsibility}</td>
                    <td>
                      {team.payment_type === 'Fixed Amount' ? (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(team.agreed_amount)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          {team.percentage_share}%
                        </span>
                      )}
                    </td>
                    <td className="font-semibold text-primary">{formatCurrency(getCalculatedPay(team))}</td>
                    <td>
                      <Badge
                        variant={team.payment_status === 'Paid' ? 'default' : team.payment_status === 'Partial' ? 'secondary' : 'destructive'}
                      >
                        {team.payment_status}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(team)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(team.id)}>
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
            {filtered.map(team => (
              <div key={team.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{getContractorName(team.contractor_id)}</h3>
                    <p className="text-sm text-muted-foreground">{team.responsibility}</p>
                  </div>
                  <Badge
                    variant={team.payment_status === 'Paid' ? 'default' : team.payment_status === 'Partial' ? 'secondary' : 'destructive'}
                  >
                    {team.payment_status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span>{getProjectName(team.project_id)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {team.payment_type === 'Fixed Amount' ? 'Fixed' : `${team.percentage_share}%`}
                    </p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(getCalculatedPay(team))}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => openEdit(team)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => handleDelete(team.id)}>
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
