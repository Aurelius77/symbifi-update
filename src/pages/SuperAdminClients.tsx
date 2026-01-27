import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';

interface ClientRow {
  id: string;
  user_id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  country: string | null;
  industry: string | null;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  billing_interval: string;
  created_at: string;
}

export function SuperAdminClients() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userRole === 'admin') {
      fetchClients();
    }
  }, [userRole]);

  const fetchClients = async () => {
    setLoading(true);
    const [clientsRes, subscriptionsRes] = await Promise.all([
      supabase.from('profiles').select('id, user_id, full_name, business_name, email, country, industry, created_at'),
      supabase.from('subscriptions').select('id, user_id, tier, status, billing_interval, created_at'),
    ]);

    if (clientsRes.error || subscriptionsRes.error) {
      toast.error('Failed to load client directory.');
      setLoading(false);
      return;
    }

    setClients(clientsRes.data || []);
    setSubscriptions(subscriptionsRes.data || []);
    setLoading(false);
  };

  const subscriptionByUser = useMemo(() => {
    return subscriptions.reduce<Record<string, SubscriptionRow>>((acc, sub) => {
      const existing = acc[sub.user_id];
      if (!existing) {
        acc[sub.user_id] = sub;
      } else if (existing.status !== 'active' && sub.status === 'active') {
        acc[sub.user_id] = sub;
      } else if (new Date(sub.created_at).getTime() > new Date(existing.created_at).getTime()) {
        acc[sub.user_id] = sub;
      }
      return acc;
    }, {});
  }, [subscriptions]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clients.filter(client => {
      const name = client.business_name || client.full_name || '';
      const email = client.email || '';
      return name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
    });
  }, [clients, searchTerm]);

  const newClients = clients.filter(client => {
    const created = new Date(client.created_at);
    return Date.now() - created.getTime() < 1000 * 60 * 60 * 24 * 30;
  }).length;

  const activeSubscriptions = subscriptions.filter(sub => sub.status?.toLowerCase() === 'active').length;

  return (
    <SuperAdminShell>
      <header className="px-6 pt-8 pb-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="super-admin-pill">
              <Users className="h-3.5 w-3.5 text-cyan-200" />
              Client Directory
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold">Client Accounts</h1>
            <p className="text-slate-300 max-w-2xl text-sm sm:text-base">
              Review onboarding progress, subscription status, and account details for every client.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
              onClick={fetchClients}
            >
              Refresh Directory
            </Button>
          </div>
        </div>
        <div className="mt-6">
          <SuperAdminNav />
        </div>
      </header>

      <main className="px-6 pb-16 sm:px-10 lg:px-16 space-y-6">
        {loading ? (
          <div className="super-admin-card w-full text-center space-y-3">
            <div className="super-admin-pill mx-auto">Loading Clients</div>
            <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Fetching client accounts...</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Total Clients', value: clients.length },
                { label: 'Active Subscriptions', value: activeSubscriptions },
                { label: 'New This Month', value: newClients },
              ].map(card => (
                <div key={card.label} className="super-admin-card">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
                  <p className="text-3xl font-semibold mt-3 super-admin-mono">{card.value}</p>
                </div>
              ))}
            </section>

            <section className="super-admin-card space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Client List</h2>
                  <p className="text-xs text-slate-400 mt-1">Search and open individual client profiles.</p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="bg-slate-950/40 border-slate-700/70 text-slate-100 placeholder:text-slate-500 pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {filteredClients.length === 0 ? (
                <p className="text-sm text-slate-400">No clients match your search.</p>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map(client => {
                    const subscription = subscriptionByUser[client.user_id];
                    const status = subscription?.status || 'inactive';
                    return (
                      <div
                        key={client.id}
                        className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {client.business_name || client.full_name || 'Unnamed client'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">{client.email || 'No email'}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {client.country || 'N/A'} • {client.industry || 'General'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs text-slate-300 uppercase tracking-[0.2em]">
                            {subscription?.tier || 'no plan'}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                              status === 'active'
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                                : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                            }`}
                          >
                            {status}
                          </span>
                          <Link to={`/super-admin/clients/${client.user_id}`}>
                            <Button className="rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300">
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </SuperAdminShell>
  );
}
