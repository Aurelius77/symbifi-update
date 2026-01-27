import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Overview', href: '/super-admin' },
  { name: 'Clients', href: '/super-admin/clients' },
  { name: 'Projects', href: '/super-admin/projects' },
  { name: 'Contractors', href: '/super-admin/contractors' },
  { name: 'Payments', href: '/super-admin/payments' },
  { name: 'Subscriptions', href: '/super-admin/subscriptions' },
];

export function SuperAdminNav() {
  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            `rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.25em] transition ${
              isActive
                ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100'
                : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-500/60'
            }`
          }
        >
          {item.name}
        </NavLink>
      ))}
    </nav>
  );
}
