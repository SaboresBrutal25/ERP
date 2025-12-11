'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    { href: '/', icon: 'group', label: 'Gestión de Personal' },
    { href: '/horarios', icon: 'calendar_month', label: 'Horarios' },
    { href: '/nominas', icon: 'payments', label: 'Nóminas' },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col flex-shrink-0 z-20">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
            ERP
          </div>
          <span className="text-xl font-bold text-slate-800 dark:text-white">ERP System</span>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-6 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Rol</p>
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-green-500 text-sm">verified_user</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Administrador</span>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-primary font-medium'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-rounded">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
