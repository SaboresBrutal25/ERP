import React, { useEffect, useState } from "react";
import Layout from "./components/Layout.jsx";
import Login from "./components/Login.jsx";
import ModulePage from "./components/ModulePage.jsx";
import { supabase } from "./lib/supabaseClient";
import { logout } from "./api";

const locales = ["Brutal Soul", "Stella Brutal"];

const modules = [
  {
    title: "Gestión de Personal",
    resource: "empleados",
    description: "Administra empleados, contratos, sueldos, IBAN, documentación y vacaciones de forma centralizada.",
    fields: [
      { key: "nombre", label: "Nombre completo", required: true },
      { key: "dni", label: "DNI/NIE", required: false },
      { key: "contrato", label: "Tipo de contrato", required: false },
      { key: "sueldo", label: "Sueldo (€)", type: "number", required: true, step: "0.01" },
      { key: "iban", label: "IBAN", required: false },
      { key: "vacaciones_tomadas", label: "Días de vacaciones tomados", type: "number", step: "0.5", required: false },
      { key: "vacaciones_restantes", label: "Días de vacaciones restantes", type: "number", step: "0.5", required: false },
      { key: "documentos", label: "Documentos", required: false },
      { key: "turno", label: "Turno", required: false },
      { key: "notas", label: "Notas adicionales", required: false }
    ]
  }
];

const App = () => {
  const [user, setUser] = useState(null);
  const [selectedLocale, setSelectedLocale] = useState(locales[0]);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };
    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("theme-light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout
      user={user}
      onLogout={handleLogout}
      onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      theme={theme}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {/* Dashboard Header */}
        <div className="card p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="pill bg-brand-600/20 border-brand-500/40 text-brand-300">
                  Panel de Control
                </span>
                <span className="pill">
                  {selectedLocale}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                Gestión de Personal
              </h2>
              <p className="text-surface-300 max-w-3xl">
                Administra empleados, documentación y vacaciones para ambos locales desde una plataforma centralizada.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 min-w-[280px]">
              <div className="card p-5 bg-gradient-to-br from-brand-600/20 to-brand-700/20 border-brand-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-brand-500/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-brand-200 font-medium">Módulos activos</p>
                <p className="text-2xl font-bold text-white mt-1">{modules.length}</p>
              </div>

              <div className="card p-5 bg-gradient-to-br from-accent-600/20 to-accent-700/20 border-accent-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-accent-500/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-accent-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-accent-200 font-medium">Local activo</p>
                <p className="text-lg font-bold text-white mt-1 truncate">{selectedLocale}</p>
              </div>
            </div>
          </div>

          {/* Locale Selector */}
          <div className="mt-6 flex flex-wrap gap-3">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => setSelectedLocale(locale)}
                className={`btn text-sm transition-all ${
                  selectedLocale === locale
                    ? "btn-primary"
                    : "hover:bg-surface-600/50"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {locale}
              </button>
            ))}
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-6">
          {modules.map((mod) => (
            <ModulePage key={mod.resource} {...mod} locale={selectedLocale} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default App;
