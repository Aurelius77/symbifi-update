import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';

interface ContractorRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  contractor_type: string;
  created_at: string;
  user_id: string;
}

export function SuperAdminContractors() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<ContractorRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (userRole === 'admin') {
      fetchContractors();
    }
  }, [userRole]);

  const fetchContractors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contractors')
      .select('id, full_name, email, role, status, contractor_type, created_at, user_id');

    if (error) {
      toast.error('Failed to load contractor network.');
      setLoading(false);
      return;
    }
    setContractors(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return contractors.filter(contractor => {
      const matchesSearch =
        contractor.full_name.toLowerCase().includes(term) ||
        contractor.email.toLowerCase().includes(term) ||
        contractor.role.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || contractor.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contractors, searchTerm, statusFilter]);

  const activeCount = contractors.filter(contractor => contractor.status?.toLowerCase() === 'active').length;

  return (
    <SuperAdminShell>
      <header className="px-6 pt-8 pb-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="super-admin-pill">
              <Users className="h-3.5 w-3.5 text-cyan-200" />
              Contractor Compliance
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold">Contractor Network</h1>
            <p className="text-slate-300 max-w-2xl text-sm sm:text-base">
              Monitor contractor readiness, roles, and payment status for every client.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
            onClick={fetchContractors}
          >
            Refresh Contractors
          </Button>
        </div>
        <div className="mt-6">
          <SuperAdminNav />
        </div>
      </header>

      <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-6">
        {loading ? (
          <div className="super-admin-card w-full text-center space-y-3">
            <div className="super-admin-pill mx-auto">Loading Contractors</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Fetching contractor data...</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Total Contractors', value: contractors.length },
                { label: 'Active Contractors', value: activeCount },
                { label: 'Inactive Contractors', value: contractors.length - activeCount },
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
                  <h2 className="text-xl font-semibold">Contractor List</h2>
                  <p className="text-xs text-slate-400 mt-1">Search by name, role, or email.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-72">
                    <Input
                      placeholder="Search contractors..."
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400">No contractors match your filters.</p>
              ) : (
                <div className="space-y-3">
                  {filtered.map(contractor => (
                    <div
                      key={contractor.id}
                      className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold">{contractor.full_name}</p>
                        <p className="text-xs text-slate-400 mt-1">{contractor.email}</p>
                        <p className="text-xs text-slate-500 mt-1">{contractor.role} • {contractor.contractor_type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                          {contractor.status}
                        </span>
                        <Link to={`/super-admin/contractors/${contractor.id}`}>
                          <Button
                            variant="outline"
                            className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                          >
                            View
                          </Button>
                        </Link>
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
