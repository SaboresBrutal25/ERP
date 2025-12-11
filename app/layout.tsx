import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ERP Hostelería - Gestión Integral',
  description: 'Sistema ERP para gestión de hostelería',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
