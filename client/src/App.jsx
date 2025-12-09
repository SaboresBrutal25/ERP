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
    description: "Ficha completa por empleado: datos, IBAN, documentos y vacaciones.",
    fields: [
      { key: "nombre", label: "Nombre", required: true },
      { key: "dni", label: "DNI", required: false },
      { key: "contrato", label: "Contrato", required: false },
      { key: "sueldo", label: "Sueldo", type: "number", required: true, step: "0.01" },
      { key: "iban", label: "Cuenta bancaria (IBAN)", required: false },
      { key: "vacaciones_tomadas", label: "Vacaciones tomadas (días)", type: "number", step: "0.5", required: false },
      { key: "vacaciones_restantes", label: "Vacaciones restantes (días)", type: "number", step: "0.5", required: false },
      { key: "documentos", label: "Documentos", required: false },
      { key: "turno", label: "Turno", required: false },
      { key: "notas", label: "Notas", required: false }
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
    <Layout user={user} onLogout={handleLogout} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} theme={theme}>
      <div className="card p-7 lg:p-10 border-white/5 text-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate bg-[length:40px_40px] opacity-40" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand-600/20 via-brand-500/10 to-transparent" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-200">Panel de Control</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
              Gestión de Personal centralizada
            </h2>
            <p className="text-slate-300 max-w-3xl">
              Controla empleados, IBAN, documentos y vacaciones (30 días/año) para ambos locales. Datos en Supabase, accesibles para los dos administradores.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="pill">Operando en {selectedLocale}</span>
              <span className="pill bg-brand-600/20 border-brand-500/40 text-brand-50">Datos en Supabase</span>
              <span className="pill bg-white/10">Importa CSV de personal y nóminas</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 min-w-[260px] text-sm">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-glass">
              <p className="text-slate-400 text-xs">Módulos activos</p>
              <p className="text-2xl font-semibold text-white">1</p>
              <p className="text-xs text-slate-500 mt-1">Solo personal</p>
            </div>
            <div className="p-4 rounded-2xl bg-brand-600/20 border border-brand-500/30 shadow-soft">
              <p className="text-brand-100 text-xs">Tema</p>
              <p className="text-xl font-semibold text-white">{theme === "dark" ? "Oscuro" : "Claro"}</p>
              <p className="text-xs text-brand-50 mt-1">Cámbialo en el header</p>
            </div>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-3">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => setSelectedLocale(locale)}
              className={`btn text-sm ${selectedLocale === locale ? "btn-primary" : "bg-white/5"}`}
            >
              {locale}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {modules.map((mod) => (
          <ModulePage key={mod.resource} {...mod} locale={selectedLocale} />
        ))}
      </div>
    </Layout>
  );
};

export default App;
