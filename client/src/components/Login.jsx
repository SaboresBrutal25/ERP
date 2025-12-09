import React, { useState } from "react";
import { login } from "../api.js";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-900 text-slate-100">
      <div className="card w-full max-w-5xl p-8 lg:p-10 grid lg:grid-cols-2 gap-10 border-white/5">
        <div className="space-y-5">
          <div className="pill text-brand-50 bg-brand-600/20 border-brand-500/40 inline-flex">ERP Hostelería</div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Controla tu operación diaria con un panel moderno y ágil.
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Persistencia en Supabase: sin hojas de cálculo, sin duplicidades. Diseñado para que los dos administradores
            puedan trabajar en paralelo.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-xs text-slate-400">Usuarios</p>
              <p className="font-semibold">admin1@... (tu email)</p>
              <p className="font-semibold">admin2@... (tu email)</p>
            </div>
            <div className="p-4 rounded-2xl bg-brand-600/15 border border-brand-500/30 text-brand-50">
              <p className="text-xs text-brand-100">Seguridad</p>
              <p className="font-semibold">Autenticación Supabase</p>
              <p className="font-semibold">Datos en la nube</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 bg-surface-900/80 border border-white/10 rounded-2xl p-6 shadow-soft">
          <div>
            <p className="text-sm text-slate-300">Accede al panel</p>
            <h2 className="text-2xl font-semibold text-white">Iniciar sesión</h2>
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-200">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="input"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-200">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="input"
              required
            />
          </label>
          {error && (
            <p className="text-sm text-rose-200 bg-rose-900/40 border border-rose-500/30 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 rounded-xl text-sm">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
