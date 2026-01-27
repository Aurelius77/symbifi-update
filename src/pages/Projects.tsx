import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription } from '@/hooks/useSubscription';
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
import { format } from 'date-fns';
import { toast } from 'sonner';

type ProjectStatus = 'Active' | 'Completed' | 'On Hold';
type PaymentStructure = 'Single payment' | 'Milestones';
type MilestoneStatus = 'Planned' | 'In Progress' | 'Approved' | 'Paid';

interface Project {
  id: string;
  name: string;
  client_name: string;
  start_date: string;
  end_date: string | null;
  total_budget: number;
  payment_structure: string;
  status: string;
  notes: string | null;
}

interface MilestoneForm {
  id?: string;
  title: string;
  description: string;
  due_date: string;
  amount: string;
  percentage: string;
  status: MilestoneStatus;
}

export function Projects() {
  const { user } = useAuth();
  const { formatCurrency, getCurrencySymbol } = useUserProfile();
  const { limits, tierLabel, loading: subscriptionLoading } = useSubscription();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [milestones, setMilestones] = useState<MilestoneForm[]>([]);
  const [existingMilestoneIds, setExistingMilestoneIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    start_date: '',
    end_date: '',
    total_budget: '',
    payment_structure: 'Single payment' as PaymentStructure,
    status: 'Active' as ProjectStatus,
    notes: '',
  });

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const activeProjectsCount = projects.filter((project) => project.status === 'Active').length;
  const activeProjectLimit = limits.activeProjects;
  const activeProjectLimitReached =
    !subscriptionLoading &&
    activeProjectLimit !== null &&
    activeProjectsCount >= activeProjectLimit;
  const isCreatingActiveProject = !editingProject && formData.status === 'Active';
  const isUpdatingToActive =
    !!editingProject &&
    editingProject.status !== 'Active' &&
    formData.status === 'Active';
  const activeProjectBlocked = (isCreatingActiveProject || isUpdatingToActive) && activeProjectLimitReached;

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load projects');
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      client_name: '',
      start_date: '',
      end_date: '',
      total_budget: '',
      payment_structure: 'Single payment',
      status: 'Active',
      notes: '',
    });
    setMilestones([]);
    setExistingMilestoneIds([]);
    setEditingProject(null);
  };

  const createEmptyMilestone = (): MilestoneForm => ({
    title: '',
    description: '',
    due_date: '',
    amount: '',
    percentage: '',
    status: 'Planned',
  });

  const addMilestone = () => {
    setMilestones((prev) => [...prev, createEmptyMilestone()]);
  };

  const updateMilestone = (index: number, updates: Partial<MilestoneForm>) => {
    setMilestones((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchMilestonesForProject = async (projectId: string) => {
    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('sequence', { ascending: true });

    if (error) {
      toast.error('Failed to load milestones');
      return 0;
    }

    const mapped = (data || []).map((milestone) => ({
      id: milestone.id as string,
      title: milestone.title || '',
      description: milestone.description || '',
      due_date: milestone.due_date || '',
      amount: milestone.amount ? String(milestone.amount) : '',
      percentage: milestone.percentage ? String(milestone.percentage) : '',
      status: (milestone.status as MilestoneStatus) || 'Planned',
    }));

    setMilestones(mapped);
    setExistingMilestoneIds(mapped.map((milestone) => milestone.id!).filter(Boolean));
    return mapped.length;
  };

  const syncMilestones = async (projectId: string) => {
    if (!user) return { error: null as Error | null };

    const rows = milestones.map((milestone, index) => ({
      id: milestone.id,
      user_id: user.id,
      project_id: projectId,
      title: milestone.title.trim(),
      description: milestone.description.trim() || null,
      due_date: milestone.due_date || null,
      amount: milestone.amount ? parseFloat(milestone.amount) : null,
      percentage: milestone.percentage ? parseFloat(milestone.percentage) : null,
      sequence: index + 1,
      status: milestone.status || 'Planned',
    }));

    const currentIds = rows.map((row) => row.id).filter(Boolean) as string[];
    const idsToDelete = existingMilestoneIds.filter((id) => !currentIds.includes(id));

    const errors: Error[] = [];

    if (idsToDelete.length > 0) {
      const { error } = await supabase.from('project_milestones').delete().in('id', idsToDelete);
      if (error) errors.push(error);
    }

    const updates = rows.filter((row) => row.id);
    const inserts = rows.filter((row) => !row.id);

    const updateResults = await Promise.all(
      updates.map((row) =>
        supabase
          .from('project_milestones')
          .update({
            title: row.title,
            description: row.description,
            due_date: row.due_date,
            amount: row.amount,
            percentage: row.percentage,
            sequence: row.sequence,
            status: row.status,
          })
          .eq('id', row.id as string),
      ),
    );

    updateResults.forEach((result) => {
      if (result.error) errors.push(result.error);
    });

    if (inserts.length > 0) {
      const { error } = await supabase
        .from('project_milestones')
        .insert(inserts.map(({ id, ...rest }) => rest));
      if (error) errors.push(error);
    }

    return { error: errors[0] || null };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeProjectBlocked) {
      toast.error('Active project limit reached for your plan.');
      return;
    }
    
    const projectData = {
      user_id: user!.id,
      name: formData.name,
      client_name: formData.client_name,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      total_budget: parseFloat(formData.total_budget) || 0,
      payment_structure: formData.payment_structure,
      status: formData.status,
      notes: formData.notes || null,
    };

    if (formData.payment_structure === 'Milestones') {
      if (milestones.length === 0) {
        toast.error('Add at least one milestone for milestone-based projects.');
        return;
      }

      const totalBudget = parseFloat(formData.total_budget) || 0;
      let totalAmount = 0;
      let totalPercentage = 0;
      let hasAmount = false;
      let hasPercentage = false;

      for (const milestone of milestones) {
        if (!milestone.title.trim()) {
          toast.error('Each milestone needs a title.');
          return;
        }
        const amount = parseFloat(milestone.amount);
        const percentage = parseFloat(milestone.percentage);
        const amountValid = !Number.isNaN(amount) && amount > 0;
        const percentValid = !Number.isNaN(percentage) && percentage > 0;

        if (!amountValid && !percentValid) {
          toast.error('Each milestone needs an amount or percentage.');
          return;
        }

        if (amountValid) {
          hasAmount = true;
          totalAmount += amount;
        }
        if (percentValid) {
          hasPercentage = true;
          totalPercentage += percentage;
        }
      }

      if (hasAmount && !hasPercentage && totalBudget > 0 && Math.abs(totalAmount - totalBudget) > 0.01) {
        toast.error('Milestone amounts must total the project budget.');
        return;
      }
      if (hasPercentage && !hasAmount && Math.abs(totalPercentage - 100) > 0.01) {
        toast.error('Milestone percentages must total 100%.');
        return;
      }
    }

    if (editingProject) {
      const { data, error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editingProject.id)
        .select('id')
        .single();
      if (error) {
        toast.error('Failed to update project');
      } else {
        if (formData.payment_structure === 'Milestones') {
          const { error: milestoneError } = await syncMilestones(editingProject.id);
          if (milestoneError) {
            toast.error('Project saved but milestones failed to update.');
          }
        } else if (existingMilestoneIds.length > 0) {
          await supabase.from('project_milestones').delete().eq('project_id', editingProject.id);
        }
        toast.success('Project updated');
        fetchProjects();
      }
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select('id')
        .single();
      if (error) {
        toast.error('Failed to create project');
      } else {
        if (formData.payment_structure === 'Milestones' && data?.id) {
          const { error: milestoneError } = await syncMilestones(data.id);
          if (milestoneError) {
            toast.error('Project created but milestones failed to save.');
          }
        }
        toast.success('Project created');
        fetchProjects();
      }
    }
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = async (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client_name: project.client_name,
      start_date: project.start_date,
      end_date: project.end_date || '',
      total_budget: project.total_budget.toString(),
      payment_structure: project.payment_structure as PaymentStructure,
      status: project.status as ProjectStatus,
      notes: project.notes || '',
    });
    if (project.payment_structure === 'Milestones') {
      const count = await fetchMilestonesForProject(project.id);
      if (count === 0) {
        setMilestones([createEmptyMilestone()]);
      }
    } else {
      setMilestones([]);
      setExistingMilestoneIds([]);
    }
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete project');
    } else {
      toast.success('Project deleted');
      fetchProjects();
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Active': 'badge-status badge-active',
      'Completed': 'badge-status badge-paid',
      'On Hold': 'badge-status badge-partial',
    };
    return <span className={styles[status] || 'badge-status'}>{status}</span>;
  };

  const milestoneTotals = milestones.reduce(
    (acc, milestone) => {
      const amount = parseFloat(milestone.amount);
      const percentage = parseFloat(milestone.percentage);
      if (!Number.isNaN(amount)) acc.amount += amount;
      if (!Number.isNaN(percentage)) acc.percentage += percentage;
      return acc;
    },
    { amount: 0, percentage: 0 },
  );

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
          <h1 className="page-title">Projects</h1>
          <p className="page-description">Manage your client projects and budgets</p>
          {activeProjectLimit !== null && (
            <p className="text-xs text-muted-foreground mt-2">
              {tierLabel} plan: {activeProjectsCount}/{activeProjectLimit} active projects
            </p>
          )}
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input id="client_name" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_budget">Total Budget ({getCurrencySymbol()})</Label>
                  <Input id="total_budget" type="number" value={formData.total_budget} onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_structure">Payment Structure</Label>
                  <Select
                    value={formData.payment_structure}
                    onValueChange={(value: PaymentStructure) => {
                      setFormData({ ...formData, payment_structure: value });
                      if (value === 'Milestones' && milestones.length === 0) {
                        setMilestones([createEmptyMilestone()]);
                      }
                      if (value !== 'Milestones') {
                        setMilestones([]);
                        setExistingMilestoneIds([]);
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single payment">Single payment</SelectItem>
                      <SelectItem value="Milestones">Milestones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.payment_structure === 'Milestones' && (
                <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Milestone Schedule</p>
                      <p className="text-xs text-muted-foreground">
                        Add milestone titles with amount or percentage (or both).
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                      <Plus className="w-3 h-3 mr-1" /> Add Milestone
                    </Button>
                  </div>

                  {milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No milestones yet. Add your first milestone.</p>
                  ) : (
                    <div className="space-y-4">
                      {milestones.map((milestone, index) => (
                        <div key={milestone.id || index} className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Milestone {index + 1}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMilestone(index)}
                              className="text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={milestone.title}
                                onChange={(e) => updateMilestone(index, { title: e.target.value })}
                                placeholder="Milestone title"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Due Date</Label>
                              <Input
                                type="date"
                                value={milestone.due_date}
                                onChange={(e) => updateMilestone(index, { due_date: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Amount ({getCurrencySymbol()})</Label>
                              <Input
                                type="number"
                                value={milestone.amount}
                                onChange={(e) => updateMilestone(index, { amount: e.target.value })}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Percentage (%)</Label>
                              <Input
                                type="number"
                                value={milestone.percentage}
                                onChange={(e) => updateMilestone(index, { percentage: e.target.value })}
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Select
                                value={milestone.status}
                                onValueChange={(value: MilestoneStatus) => updateMilestone(index, { status: value })}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Planned">Planned</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Approved">Approved</SelectItem>
                                  <SelectItem value="Paid">Paid</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Description (Optional)</Label>
                              <Textarea
                                value={milestone.description}
                                onChange={(e) => updateMilestone(index, { description: e.target.value })}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Total amounts: {formatCurrency(milestoneTotals.amount)}
                    </span>
                    <span>Total percentages: {milestoneTotals.percentage.toFixed(2)}%</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: ProjectStatus) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                {activeProjectLimit !== null && (
                  <p className="text-xs text-muted-foreground">
                    {activeProjectsCount}/{activeProjectLimit} active projects used on the {tierLabel} plan.
                  </p>
                )}
                {activeProjectBlocked && (
                  <p className="text-xs text-destructive">
                    Upgrade your plan to add more active projects.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={activeProjectBlocked}>
                  {editingProject ? 'Update' : 'Create'} Project
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(value: ProjectStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No projects found. Add your first project to get started.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Duration</th>
                  <th>Budget</th>
                  <th>Structure</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="font-medium">{project.name}</td>
                    <td>{project.client_name}</td>
                    <td className="text-muted-foreground">
                      {format(new Date(project.start_date), 'MMM d, yyyy')}
                      {project.end_date && ` - ${format(new Date(project.end_date), 'MMM d, yyyy')}`}
                    </td>
                    <td className="font-semibold text-primary">{formatCurrency(Number(project.total_budget))}</td>
                    <td>{project.payment_structure}</td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(project.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden grid gap-4">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.client_name}</p>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-primary">{formatCurrency(Number(project.total_budget))}</p>
                  <span className="text-xs text-muted-foreground">{project.payment_structure}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(project.start_date), 'MMM d, yyyy')}
                  {project.end_date && ` - ${format(new Date(project.end_date), 'MMM d, yyyy')}`}
                </p>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(project)} className="flex-1">
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(project.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
