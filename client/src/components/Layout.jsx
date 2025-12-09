import React from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";

const Layout = ({ user, onLogout, onToggleTheme, theme, children }) => (
  <div id="top" className="min-h-screen flex text-slate-100 bg-surface-900">
    <Sidebar user={user} />
    <div className="flex-1 flex flex-col">
      <Header user={user} onLogout={onLogout} onToggleTheme={onToggleTheme} theme={theme} />
      <main className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full animate-fade-up">{children}</main>
    </div>
  </div>
);

export default Layout;
