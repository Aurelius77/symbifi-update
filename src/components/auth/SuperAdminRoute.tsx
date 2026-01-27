import { ReactNode, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SuperAdminRouteProps {
  children: ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { user, loading, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/super-admin/login');
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="super-admin super-admin-bg min-h-screen flex items-center justify-center text-slate-100">
        <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3 animate-fade-in">
          <div className="super-admin-pill mx-auto">Verifying Access</div>
          <div className="w-10 h-10 border-2 border-cyan-400/40 border-t-cyan-200 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-300">Checking super admin credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!userRole) {
    return (
      <div className="super-admin super-admin-bg min-h-screen flex items-center justify-center text-slate-100">
        <div className="super-admin-card w-[min(420px,92vw)] text-center space-y-3 animate-fade-in">
          <div className="super-admin-pill mx-auto">Syncing Role</div>
          <div className="w-10 h-10 border-2 border-amber-400/40 border-t-amber-200 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-300">Loading role permissions...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="super-admin super-admin-bg min-h-screen flex items-center justify-center text-slate-100">
        <div className="super-admin-card w-[min(480px,92vw)] text-center space-y-4 animate-fade-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-200">
            <ShieldX className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Access Denied</h1>
            <p className="text-sm text-slate-300 mt-2">
              This area is reserved for super admins. Contact support to request access.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/"
              className="rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500/60"
            >
              Return to App
            </Link>
            <Link
              to="/auth"
              className="rounded-full bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Switch Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
