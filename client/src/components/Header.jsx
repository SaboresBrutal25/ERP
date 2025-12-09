import React from "react";

const Header = ({ user, onLogout, onToggleTheme, theme }) => (
  <header className="h-20 bg-surface-800/70 border-b border-white/5 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-20 backdrop-blur-xl">
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 rounded-2xl bg-brand-600 text-white border border-brand-400/60 flex items-center justify-center text-lg font-bold shadow-soft">
        ERP
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-brand-200">Hostelería</p>
        <h2 className="text-xl font-semibold text-white">Gestión de Personal</h2>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <button onClick={onToggleTheme} className="btn text-sm px-3 py-2">
        {theme === "dark" ? "Modo claro" : "Modo oscuro"}
      </button>
      <div className="text-right">
        <p className="text-sm font-semibold text-white">{user?.email}</p>
        <p className="text-xs text-slate-400">Administrador · Supabase</p>
      </div>
      <button onClick={onLogout} className="btn bg-white/10 hover:bg-white/15 text-sm px-4 py-2 rounded-xl">
        Salir
      </button>
    </div>
  </header>
);

export default Header;
