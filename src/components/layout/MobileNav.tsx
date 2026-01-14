import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  UserCheck, 
  CreditCard, 
  FileText, 
  Settings,
  Wallet,
  Menu,
  X
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Contractors', href: '/contractors', icon: Users },
  { name: 'Project Team', href: '/project-team', icon: UserCheck },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Payment Summary', href: '/payment-summary', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border" style={{ background: 'var(--gradient-sidebar)' }}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Wallet className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-sidebar-foreground">SymbiFi</h1>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border" style={{ background: 'var(--gradient-sidebar)' }}>
            <div className="p-6 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-sidebar-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-sidebar-foreground">SymbiFi</h1>
                  <p className="text-xs text-sidebar-foreground/60">Payroll Manager</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
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
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <p className="text-xs text-sidebar-foreground/50 text-center">© 2024 SymbiFi</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
