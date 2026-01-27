import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderKanban, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  status: string;
  total_budget: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  user_id: string;
}

export function SuperAdminProjects() {
  const { userRole } = useAuth();
  const { formatCurrency } = useUserProfile();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const clientFilter = searchParams.get('client');

  useEffect(() => {
    if (userRole === 'admin') {
      fetchProjects();
    }
  }, [userRole]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, client_name, status, total_budget, start_date, end_date, created_at, user_id');

    if (error) {
      toast.error('Failed to load project ledger.');
      setLoading(false);
      return;
    }
    setProjects(data || []);
    setLoading(false);
  };

  const filteredProjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects.filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(term) ||
        project.client_name.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || project.status.toLowerCase() === statusFilter;
      const matchesClient = !clientFilter || project.user_id === clientFilter;
      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [projects, searchTerm, statusFilter, clientFilter]);

  const totalBudget = projects.reduce((sum, project) => sum + Number(project.total_budget || 0), 0);
  const activeProjects = projects.filter(project => project.status?.toLowerCase() === 'active').length;

  return (
    <SuperAdminShell>
      <header className="px-6 pt-8 pb-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="super-admin-pill">
              <FolderKanban className="h-3.5 w-3.5 text-cyan-200" />
              Project Ledger
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold">Projects Overview</h1>
            <p className="text-slate-300 max-w-2xl text-sm sm:text-base">
              Track all projects, budgets, and delivery statuses across the platform.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
            onClick={fetchProjects}
          >
            Refresh Projects
          </Button>
        </div>
        <div className="mt-6">
          <SuperAdminNav />
        </div>
      </header>

      <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-6">
        {loading ? (
          <div className="super-admin-card w-full text-center space-y-3">
            <div className="super-admin-pill mx-auto">Loading Projects</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Fetching project ledger...</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Total Projects', value: projects.length },
                { label: 'Active Projects', value: activeProjects },
                { label: 'Total Budget', value: formatCurrency(totalBudget) },
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
                  <h2 className="text-xl font-semibold">Project List</h2>
                  <p className="text-xs text-slate-400 mt-1">Search by project or client name.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-72">
                    <Input
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="bg-slate-950/40 border-slate-700/70 text-slate-100 placeholder:text-slate-500 pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 bg-slate-950/40 border-slate-700/70 text-slate-100">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredProjects.length === 0 ? (
                <p className="text-sm text-slate-400">No projects match your filters.</p>
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map(project => (
                    <div
                      key={project.id}
                      className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold">{project.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{project.client_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                          {project.status}
                        </span>
                        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                          {formatCurrency(Number(project.total_budget || 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </SuperAdminShell>
  );
}
