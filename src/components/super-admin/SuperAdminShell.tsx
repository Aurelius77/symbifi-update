import { ReactNode } from 'react';

interface SuperAdminShellProps {
  children: ReactNode;
}

export function SuperAdminShell({ children }: SuperAdminShellProps) {
  return (
    <div className="super-admin super-admin-bg min-h-screen text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 super-admin-grid opacity-40" />
      <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute top-24 right-6 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
