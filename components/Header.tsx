'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface HeaderProps {
  title: string
  subtitle: string
  icon?: string
  showBackButton?: boolean
  localName?: string
  onLocalChange?: (local: string) => void
}

export default function Header({ title, subtitle, icon, showBackButton, localName, onLocalChange }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false)
  const [localAvatar, setLocalAvatar] = useState<string | null>(null)
  const [showLocalDropdown, setShowLocalDropdown] = useState(false)
  const [localLogos, setLocalLogos] = useState<Record<string, string>>({})
  const locales = ['Brutal Soul', 'Stella Brutal']
  const [hydratedLocal, setHydratedLocal] = useState<string | undefined>(localName)

  useEffect(() => {
    // Verificar si hay preferencia guardada (solo en cliente)
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode')
      if (savedMode) {
        setDarkMode(savedMode === 'true')
        document.documentElement.classList.toggle('dark', savedMode === 'true')
      }
    }
  }, [])

  useEffect(() => {
    // Cargar logos de todos los locales
    const fetchAllLogos = async () => {
      const logos: Record<string, string> = {}
      for (const local of locales) {
        const slug = local.trim().toLowerCase().replace(/\s+/g, '-')
        const candidates = [`${slug}.png`, `${slug}.jpg`, `${slug}.jpeg`, `${slug}.webp`]

        for (const candidate of candidates) {
          const { data } = supabase.storage.from('locales').getPublicUrl(candidate)
          const publicUrl = data?.publicUrl
          if (!publicUrl) continue

          try {
            const res = await fetch(publicUrl, { method: 'HEAD' })
            if (res.ok) {
              logos[local] = publicUrl
              break
            }
          } catch (error) {
            console.warn('Error verificando logo de local', error)
          }
        }
      }
      setLocalLogos(logos)
    }

    fetchAllLogos()
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    document.documentElement.classList.toggle('dark', newMode)
    localStorage.setItem('darkMode', String(newMode))
  }

  useEffect(() => {
    let isMounted = true

    const fetchLocalAvatar = async () => {
      if (!localName) {
        setLocalAvatar(null)
        return
      }

      const slug = localName.trim().toLowerCase().replace(/\s+/g, '-')
      const candidates = [`${slug}.png`, `${slug}.jpg`, `${slug}.jpeg`, `${slug}.webp`]

      for (const candidate of candidates) {
        const { data } = supabase.storage.from('locales').getPublicUrl(candidate)
        const publicUrl = data?.publicUrl
        if (!publicUrl) continue

        try {
          const res = await fetch(publicUrl, { method: 'HEAD' })
          if (res.ok) {
            if (isMounted) setLocalAvatar(publicUrl)
            return
          }
        } catch (error) {
          console.warn('Error verificando imagen de local', error)
        }
      }

      if (isMounted) setLocalAvatar(null)
    }

    fetchLocalAvatar()

    return () => {
      isMounted = false
    }
  }, [localName])

  const getLocalInitials = () => {
    const name = localName || hydratedLocal
    if (!name) return 'LC'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  useEffect(() => {
    // Evitar mismatch de hidratación: sincroniza localName inicial con localStorage en cliente
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedLocal')
      if (stored && stored !== hydratedLocal) {
        setHydratedLocal(stored)
      } else if (!hydratedLocal && localName) {
        setHydratedLocal(localName)
      }
    }
  }, [localName, hydratedLocal])

  return (
    <header className="relative z-30 h-20 px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-500 hover:text-primary hover:border-primary transition-colors"
          >
            <span className="material-symbols-rounded text-xl">arrow_back</span>
          </button>
        )}
        {icon && (
          <div className="hidden md:flex h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 items-center justify-center text-primary">
            <span className="material-symbols-rounded text-2xl">{icon}</span>
          </div>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-sm border border-slate-200 dark:border-slate-700">
          <span className="material-symbols-rounded text-yellow-500 text-sm">light_mode</span>
          <span className="text-sm font-medium dark:text-white hidden md:inline">
            {darkMode ? 'Modo oscuro' : 'Modo claro'}
          </span>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              darkMode ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowLocalDropdown(!showLocalDropdown)}
            className="flex items-center gap-3 hover:bg-white/50 dark:hover:bg-slate-800/50 p-1.5 rounded-full transition-colors"
          >
            {localAvatar ? (
              <Image
                src={localAvatar}
                alt={`Logo ${localName}`}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full ring-2 ring-white dark:ring-slate-700 object-cover"
                onError={() => setLocalAvatar(null)}
              />
            ) : (
              <div className="h-9 w-9 rounded-full ring-2 ring-white dark:ring-slate-700 bg-primary/10 text-primary font-bold flex items-center justify-center text-xs uppercase">
                {getLocalInitials()}
              </div>
            )}
            <div className="hidden lg:block text-left mr-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{localName || hydratedLocal || 'Seleccionar Local'}</p>
            </div>
            <span className="material-symbols-rounded text-slate-400 hidden md:inline">expand_more</span>
          </button>

          {/* Dropdown de locales */}
          {showLocalDropdown && (
            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[200px] z-50">
              {locales.map((local) => (
                <button
                  key={local}
                  onClick={() => {
                    if (onLocalChange) {
                      onLocalChange(local)
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('selectedLocal', local)
                      }
                    }
                    setShowLocalDropdown(false)
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 ${
                    local === localName ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {localLogos[local] ? (
                    <Image
                      src={localLogos[local]}
                      alt={`Logo ${local}`}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                      {local.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{local}</p>
                    {local === localName && (
                      <p className="text-xs text-primary">Activo</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
