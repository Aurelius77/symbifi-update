import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Lock, ShieldCheck, Sparkles, Users, FolderKanban, Receipt, Landmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SuperAdminLogin() {
  const navigate = useNavigate();
  const { signIn, signOut, user, userRole, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && userRole === 'admin') {
      navigate('/super-admin');
    }

    if (!authLoading && user && userRole === 'user') {
      setError('This account does not have super admin access.');
      signOut();
    }
  }, [authLoading, navigate, signOut, user, userRole]);

  const handleChange = (field: 'email' | 'password', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!formData.email || !formData.password) {
      setError('Enter both email and password.');
      return;
    }

    setFormLoading(true);
    const { error } = await signIn(formData.email, formData.password);
    if (error) {
      setError(error.message.includes('Invalid login credentials') ? 'Invalid email or password.' : error.message);
    } else {
      setNotice('Access granted. Loading command center...');
      navigate('/super-admin');
    }
    setFormLoading(false);
  };

  return (
    <div className="super-admin super-admin-bg min-h-screen text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 super-admin-grid opacity-60" />
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="absolute top-24 right-0 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-12 px-6 py-16 sm:px-12">
        <div className="flex flex-col justify-center gap-8 animate-fade-in">
          <div className="super-admin-pill w-fit">
            <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
            Symbifi Super Admin
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">
              Command the entire SaaS operation from one secure cockpit.
            </h1>
            <p className="text-slate-300 mt-4 max-w-xl text-lg">
              Monitor client growth, project pipelines, contractor assignments, and payment integrity in real time.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Users, title: 'Client Intelligence', detail: 'Account health, onboarding, and usage.' },
              { icon: FolderKanban, title: 'Project Ledger', detail: 'Budgets, timelines, and allocations.' },
              { icon: Receipt, title: 'Payout Oversight', detail: 'Payments, slips, and audit trails.' },
              { icon: Landmark, title: 'Revenue Controls', detail: 'Subscriptions, billing, and risk flags.' },
            ].map(item => (
              <div key={item.title} className="super-admin-surface rounded-2xl p-4 flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-400/15 border border-cyan-300/20 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-cyan-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-slate-300 mt-1">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <BadgeCheck className="h-4 w-4 text-emerald-300" />
            Enterprise security monitoring enabled.
          </div>
        </div>

        <div className="flex items-center justify-center animate-slide-up">
          <div className="super-admin-card w-full max-w-md space-y-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Secure Login</p>
              <h2 className="text-2xl font-semibold">Super Admin Access</h2>
              <p className="text-sm text-slate-300">
                Use your admin credentials to unlock the platform command center.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-slate-200">Email</Label>
                <div className="relative">
                  <Input
                    id="admin-email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => handleChange('email', event.target.value)}
                    placeholder="admin@company.com"
                    className="bg-slate-950/40 border-slate-700/70 text-slate-100 placeholder:text-slate-500"
                  />
                  <ShieldCheck className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-slate-200">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type="password"
                    value={formData.password}
                    onChange={(event) => handleChange('password', event.target.value)}
                    placeholder="Enter your password"
                    className="bg-slate-950/40 border-slate-700/70 text-slate-100 placeholder:text-slate-500"
                  />
                  <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {notice}
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300"
                disabled={formLoading}
              >
                {formLoading ? 'Authenticating...' : 'Enter Command Center'}
              </Button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <Link to="/auth" className="hover:text-slate-200">Use standard login</Link>
              <Link to="/landing" className="hover:text-slate-200">Back to landing</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
