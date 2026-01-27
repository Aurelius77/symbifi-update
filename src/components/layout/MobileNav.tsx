import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  UserCheck, 
  CreditCard, 
  FileText, 
  Settings,
  User,
  Menu,
  Receipt,
  BarChart3,
  FileCheck
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

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
  { name: 'Pricing', href: '/pricing', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useUserProfile();
  const { canInstall, promptInstall } = useInstallPrompt();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border" style={{ background: 'var(--gradient-sidebar)' }}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center overflow-hidden">
            <img src="/pavel-icon.png" alt="Pavel" className="w-5 h-5 object-contain" />
          </div>
          <h1 className="text-lg font-bold text-sidebar-foreground">Pavel</h1>
        </div>
        
        <div className="flex items-center gap-2">
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

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border" style={{ background: 'var(--gradient-sidebar)' }}>
            <div className="p-6 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center overflow-hidden">
                  <img src="/pavel-icon.png" alt="Pavel" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-sidebar-foreground">Pavel</h1>
                  <p className="text-xs text-sidebar-foreground/60">Payroll Manager</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={`nav-item ${location.pathname === item.href ? 'nav-item-active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
              {canInstall && (
                <div className="pt-3">
                  <Button
                    variant="outline"
                    className="w-full bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80"
                    onClick={() => {
                      promptInstall();
                      setOpen(false);
                    }}
                  >
                    Install Pavel
                  </Button>
                </div>
              )}
            </nav>
            <div className="p-4 border-t border-sidebar-border space-y-3">
              <p className="text-xs text-sidebar-foreground/50 text-center">© 2026 Pavel</p>
              <Button
                className="w-full bg-white text-destructive hover:bg-white/90"
                onClick={handleSignOut}
              >
                Log out
              </Button>
            </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
