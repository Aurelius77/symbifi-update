import { Link, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Users, UserCheck, CreditCard, Wallet, FileText, Settings, ShieldCheck, Receipt, BarChart3, FileCheck, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Contractors', href: '/contractors', icon: Users },
  { name: 'Project Team', href: '/project-team', icon: UserCheck },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Payment Summary', href: '/payment-summary', icon: FileText },
  { name: 'Payroll Reports', href: '/payroll-reports', icon: BarChart3 },
  { name: 'Payslips', href: '/payslips', icon: FileCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: ShieldCheck },
];

export function Sidebar() {
  const location = useLocation();
  const { userRole, signOut } = useAuth();
  const { profile } = useUserProfile();
  
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col" style={{ background: 'var(--gradient-sidebar)' }}>
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Wallet className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div><h1 className="text-xl font-bold text-sidebar-foreground">Pavel</h1><p className="text-xs text-sidebar-foreground/60">Payroll Manager</p></div>
          </div>
          <Link
            to="/settings"
            className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden border border-sidebar-border hover:bg-sidebar-accent/80 transition-colors"
            aria-label="Open settings"
          >
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Business logo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-sidebar-foreground/80" />
            )}
          </Link>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink key={item.name} to={item.href} className={`nav-item ${location.pathname === item.href ? 'nav-item-active' : ''}`}>
            <item.icon className="w-5 h-5" /><span>{item.name}</span>
          </NavLink>
        ))}
        
        {userRole === 'admin' && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3">Admin</p>
            </div>
            {adminNavigation.map((item) => (
              <NavLink key={item.name} to={item.href} className={`nav-item ${location.pathname === item.href ? 'nav-item-active' : ''}`}>
                <item.icon className="w-5 h-5" /><span>{item.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <p className="text-xs text-sidebar-foreground/50 text-center">© 2026 Pavel</p>
        <Button
          className="w-full bg-white text-destructive hover:bg-white/90"
          onClick={signOut}
        >
          Log out
        </Button>
      </div>
    </aside>
  );
}
