import React from "react";

const navItems = [
  {
    key: "empleados",
    label: "Gestión de Personal",
    href: "#empleados",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </svg>
    )
  }
];

const Sidebar = ({ user }) => (
  <aside className="hidden lg:flex w-[18.5rem] max-w-xs bg-surface-800/80 border-r border-white/5 flex-col backdrop-blur-2xl shadow-soft">
    <div className="px-6 py-7 border-b border-white/5 space-y-3">
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-brand-600/20 border border-brand-500/40 text-sm font-semibold text-brand-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">ERP</span>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Hostelería</p>
          <h1 className="text-lg font-semibold text-white">Gestión de Personal</h1>
        </div>
      </div>
      <p className="text-xs text-slate-400 flex items-center gap-2">
        Rol
        <span className="px-2 py-1 rounded-lg bg-white/5 text-brand-100 border border-white/10 capitalize">{user?.role}</span>
      </p>
    </div>
    <nav className="flex-1 px-3 py-5 space-y-1">
      {navItems.map((item) => (
        <a
          key={item.key}
          href={item.href}
          className="group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-200 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/10"
        >
          <span className="text-brand-200 group-hover:text-brand-100">{item.icon}</span>
          <span className="leading-tight">{item.label}</span>
        </a>
      ))}
    </nav>
    <div className="px-6 py-5 text-xs text-slate-400 border-t border-white/5 space-y-2">
      <p className="font-semibold text-slate-200">Locales</p>
      <p>Brutal Soul · Stella Brutal</p>
    </div>
  </aside>
);

export default Sidebar;
