import React from "react";
import Header from "./Header.jsx";

const Layout = ({ user, onLogout, onToggleTheme, theme, children }) => (
  <div className="min-h-screen flex flex-col">
    <Header user={user} onLogout={onLogout} onToggleTheme={onToggleTheme} theme={theme} />
    <main className="flex-1 animate-fade-up">
      {children}
    </main>
    <footer className="border-t border-surface-700/50 py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-surface-400">
          Sistema ERP de Hostelería · Powered by Supabase
        </p>
      </div>
    </footer>
  </div>
);

export default Layout;
