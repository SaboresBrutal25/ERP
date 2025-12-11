'use client'

import Sidebar from './Sidebar'
import Header from './Header'

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
  icon?: string
  showBackButton?: boolean
  localName?: string
  onLocalChange?: (local: string) => void
}

export default function MainLayout({
  children,
  title,
  subtitle,
  icon,
  showBackButton,
  localName,
  onLocalChange,
}: MainLayoutProps) {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-600 dark:text-slate-300 transition-colors duration-300 min-h-screen flex antialiased">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-100/40 via-purple-100/40 to-transparent dark:from-blue-900/20 dark:via-purple-900/10 pointer-events-none z-0"></div>

        <Header
          title={title}
          subtitle={subtitle}
          icon={icon}
          showBackButton={showBackButton}
          localName={localName}
          onLocalChange={onLocalChange}
        />

        <div className="flex-1 overflow-auto p-4 md:p-8 pt-2 z-10 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  )
}
