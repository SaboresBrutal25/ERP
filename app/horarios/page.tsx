'use client'

import { useEffect, useMemo, useState } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase, type Empleado, type Turno, type Extra, type LocalHorario } from '@/lib/supabase'
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Persona = (Empleado & { tipo: 'empleado'; avatarColor: string; ordenPuesto: number }) | (Extra & { tipo: 'extra'; avatarColor: string; ordenPuesto: number })

export default function GestionHorarios() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const puestoOptions = ['Camarero', 'Encargado', 'Cocinero', 'Ayudante de cocina', 'Jefe de cocina']
  const [selectedLocal, setSelectedLocal] = useState<string>('')
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'semana' | 'mes'>('semana')
  const [horariosLocal, setHorariosLocal] = useState<LocalHorario>({
    locale: 'Brutal Soul',
    manana_inicio: '09:00',
    manana_fin: '15:00',
    tarde_inicio: '16:00',
    tarde_fin: '22:00',
    extra_inicio: '20:00',
    extra_fin: '02:00',
  })
  const [showExtraModal, setShowExtraModal] = useState(false)
  const [newExtra, setNewExtra] = useState<Partial<Extra>>({
    nombre: '',
    puesto: puestoOptions[0],
    telefono: '',
    turno: 'Manana',
    hora_inicio: '09:00',
    hora_fin: '15:00',
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedLocal')
      setSelectedLocal(stored || 'Brutal Soul')
    } else {
      setSelectedLocal('Brutal Soul')
    }
  }, [])

  useEffect(() => {
    if (!selectedLocal) return
    fetchData()
    fetchHorariosLocal()
  }, [selectedLocal, currentWeekStart, currentMonth, viewMode])

  const fetchData = async () => {
    if (!selectedLocal) return
    setLoading(true)
    try {
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select('*')
        .eq('locale', selectedLocal)
      if (empleadosError) throw empleadosError

      const { data: extrasData, error: extrasError } = await supabase
        .from('extras')
        .select('*')
        .eq('locale', selectedLocal)
      if (extrasError) throw extrasError

      // Determinar rango de fechas según el modo de vista
      let startDate: string
      let endDate: string

      if (viewMode === 'mes') {
        startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
        endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      } else {
        startDate = format(currentWeekStart, 'yyyy-MM-dd')
        endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd')
      }

      const { data: turnosData, error: turnosError } = await supabase
        .from('turnos')
        .select('*')
        .eq('locale', selectedLocal)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
      if (turnosError) throw turnosError

      setEmpleados(empleadosData || [])
      setExtras(extrasData || [])
      setTurnos(turnosData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHorariosLocal = async () => {
    if (!selectedLocal) return
    try {
      const { data } = await supabase.from('local_horarios').select('*').eq('locale', selectedLocal).single()
      if (data) {
        setHorariosLocal(data as LocalHorario)
      } else {
        setHorariosLocal((prev) => ({ ...prev, locale: selectedLocal }))
      }
    } catch (err) {
      console.warn('No se pudieron cargar horarios de local', err)
      setHorariosLocal((prev) => ({ ...prev, locale: selectedLocal }))
    }
  }

  const puestoPriority = (puesto?: string) => {
    const p = (puesto || '').toLowerCase()
    if (p.includes('camarero') || p.includes('camarera')) return 1
    if (p.includes('encarg')) return 2
    if (p.includes('cocinero') || p.includes('cocina')) return 3
    if (p.includes('jefe de cocina')) return 4
    return 5
  }

  const defaultHours: Record<string, string> = {
    Manana: `${horariosLocal.manana_inicio || '09:00'} - ${horariosLocal.manana_fin || '15:00'}`,
    Tarde: `${horariosLocal.tarde_inicio || '16:00'} - ${horariosLocal.tarde_fin || '22:00'}`,
    Extra: `${horariosLocal.extra_inicio || '20:00'} - ${horariosLocal.extra_fin || '02:00'}`,
  }

  const getPersonaHours = (persona: Persona, fallbackTurno?: string) => {
    if (persona.tipo === 'extra' && persona.hora_inicio && persona.hora_fin) {
      return `${persona.hora_inicio} - ${persona.hora_fin}`
    }
    const key = fallbackTurno || persona.turno || 'Manana'
    return defaultHours[key] || ''
  }

  const personas: Persona[] = useMemo(() => {
    const mappedExtras: Persona[] = extras.map((e) => ({
      ...e,
      tipo: 'extra',
      avatarColor: 'bg-pink-100 text-pink-600',
      ordenPuesto: puestoPriority(e.puesto),
    }))
    const mappedEmpleados: Persona[] = empleados.map((e) => ({
      ...e,
      tipo: 'empleado',
      avatarColor: 'bg-orange-100 text-orange-600',
      ordenPuesto: puestoPriority(e.puesto),
    }))
    const merged = [...mappedEmpleados, ...mappedExtras].sort((a, b) => {
      if (a.ordenPuesto !== b.ordenPuesto) return a.ordenPuesto - b.ordenPuesto
      return a.nombre.localeCompare(b.nombre)
    })
    if (!searchTerm.trim()) return merged
    const term = searchTerm.toLowerCase()
    return merged.filter(
      (p) => p.nombre.toLowerCase().includes(term) || (p.puesto || '').toLowerCase().includes(term)
    )
  }, [empleados, extras, searchTerm, horariosLocal])

  const getTurnoForDay = (empleadoNombre: string, dayIndex: number) => {
    const date = format(addDays(currentWeekStart, dayIndex), 'yyyy-MM-dd')
    return turnos.find((t) => t.empleado === empleadoNombre && t.fecha === date)
  }

  const handleAddTurno = async (empleadoNombre: string, dayIndex: number, turno: string, horas?: string) => {
    const fecha = format(addDays(currentWeekStart, dayIndex), 'yyyy-MM-dd')
    const semana = format(currentWeekStart, 'yyyy-ww')
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

    try {
      await supabase.from('turnos').delete().eq('empleado', empleadoNombre).eq('fecha', fecha).eq('locale', selectedLocal)

      const { error } = await supabase.from('turnos').insert([
        {
          id,
          empleado: empleadoNombre,
          fecha,
          semana,
          turno,
          horas: horas || defaultHours[turno] || '',
          locale: selectedLocal,
        },
      ])

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error adding turno:', error)
      alert('No se pudo guardar el turno.')
    }
  }

  const handleDeleteTurno = async (empleadoNombre: string, dayIndex: number) => {
    if (!confirm('¿Eliminar este turno?')) return

    const fecha = format(addDays(currentWeekStart, dayIndex), 'yyyy-MM-dd')

    try {
      const { error } = await supabase
        .from('turnos')
        .delete()
        .eq('empleado', empleadoNombre)
        .eq('fecha', fecha)
        .eq('locale', selectedLocal)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting turno:', error)
      alert('No se pudo eliminar el turno.')
    }
  }

  const handleCreateExtra = async () => {
    if (!newExtra.nombre?.trim()) {
      alert('Introduce un nombre para el extra')
      return
    }
    try {
      const payload = {
        nombre: newExtra.nombre.trim(),
        puesto: newExtra.puesto || puestoOptions[0],
        telefono: newExtra.telefono || null,
        turno: newExtra.turno || 'Manana',
        hora_inicio: newExtra.hora_inicio || '09:00',
        hora_fin: newExtra.hora_fin || '15:00',
        locale: selectedLocal,
      }
      const { error } = await supabase.from('extras').insert([payload])
      if (error) throw error
      setShowExtraModal(false)
      setNewExtra({
        nombre: '',
        puesto: puestoOptions[0],
        telefono: '',
        turno: 'Manana',
        hora_inicio: '09:00',
        hora_fin: '15:00',
      })
      await fetchData()
      alert('Extra añadido al cuadrante.')
    } catch (error) {
      console.error('Error añadiendo extra:', error)
      alert('No se pudo añadir el extra. Revisa la tabla extras.')
    }
  }


  const handleDeleteExtra = async (extraId: string) => {
    if (!confirm('Eliminar este extra?')) return
    try {
      const { error } = await supabase.from('extras').delete().eq('id', extraId)
      if (error) throw error
      await fetchData()
    } catch (err) {
      console.error('Error eliminando extra:', err)
      alert('No se pudo eliminar el extra')
    }
  }

  const getInitials = (nombre: string) =>
    nombre
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const getTurnoColor = (turno: string) => {
    const normalized = turno.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const colors: Record<string, string> = {
      Manana: 'bg-blue-50 dark:bg-blue-900/40 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-200',
      Tarde: 'bg-purple-50 dark:bg-purple-900/40 border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-200',
      Extra: 'bg-rose-50 dark:bg-rose-900/40 border-rose-100 dark:border-rose-800 text-rose-700 dark:text-rose-200',
      Descanso: 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-300',
    }
    return colors[normalized] || 'bg-gray-100 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-200'
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const handleExport = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4')

    // Title
    doc.setFontSize(18)
    doc.text(`Horario - ${selectedLocal}`, 14, 15)
    doc.setFontSize(12)
    doc.text(
      `${format(currentWeekStart, 'd MMM yyyy', { locale: es })} - ${format(addDays(currentWeekStart, 6), 'd MMM yyyy', { locale: es })}`,
      14,
      22
    )

    // Prepare table data
    const tableHeaders = [
      'Empleado',
      ...weekDays.map(day => format(day, 'EEE d', { locale: es }))
    ]

    const tableData = personas.map(persona => {
      const row = [persona.nombre]
      for (let i = 0; i < 7; i++) {
        const turno = getTurnoForDay(persona.nombre, i)
        if (turno) {
          row.push(`${turno.turno}\n${turno.horas || defaultHours[turno.turno] || ''}`)
        } else {
          row.push('-')
        }
      }
      return row
    })

    // Generate table
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    })

    // Save PDF
    const filename = `horario_${selectedLocal}_${format(currentWeekStart, 'yyyy-MM-dd')}.pdf`
    doc.save(filename)
  }

  const handlePublish = () => {
    alert('Horario publicado para la semana seleccionada.')
  }

  const handleLocalChange = (local: string) => {
    setSelectedLocal(local)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLocal', local)
    }
  }

  return (
    <MainLayout title="Gestion de Horarios" subtitle="Planificacion semanal y gestion de turnos" localName={selectedLocal} onLocalChange={handleLocalChange}>
      {/* Controles superiores */}
      <div className="glass-panel bg-surface-light dark:bg-surface-dark rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-glass mb-6">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('semana')}
              className={`px-3 py-1 text-sm font-semibold rounded-full ${viewMode === 'semana' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500'}`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('mes')}
              className={`px-3 py-1 text-sm font-semibold rounded-full ${viewMode === 'mes' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500'}`}
            >
              Mes
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <select
              value={selectedLocal || 'Brutal Soul'}
              onChange={(e) => handleLocalChange(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 px-2 cursor-pointer"
            >
              <option>Brutal Soul</option>
              <option>Stella Brutal</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentWeekStart(addDays(currentWeekStart, -7))
                setCurrentMonth(startOfMonth(addDays(currentWeekStart, -7)))
              }}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm text-slate-500 transition-all"
            >
              <span className="material-symbols-rounded">chevron_left</span>
            </button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {format(currentWeekStart, 'd MMM', { locale: es })} - {format(addDays(currentWeekStart, 6), 'd MMM', { locale: es })}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">{format(currentWeekStart, 'yyyy')}</span>
            </div>
            <button
              onClick={() => {
                setCurrentWeekStart(addDays(currentWeekStart, 7))
                setCurrentMonth(startOfMonth(addDays(currentWeekStart, 7)))
              }}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm text-slate-500 transition-all"
            >
              <span className="material-symbols-rounded">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-primary transition-colors shadow-sm"
          >
            <span className="material-symbols-rounded text-lg">download</span>
            Exportar
          </button>
          <button
            onClick={handlePublish}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 transition-all"
          >
            <span className="material-symbols-rounded text-lg">send</span>
            Publicar
          </button>
        </div>
      </div>

      {/* Selector rápido de extras */}
      {extras.length > 0 && (
        <div className="glass-panel bg-surface-light dark:bg-surface-dark rounded-2xl p-3 mb-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">Selecciona un extra para añadir turnos rápidamente:</p>
          <div className="flex flex-wrap gap-2">
            {extras.map((extra) => (
              <button
                key={extra.id}
                onClick={() => {
                  // Scroll to the employee in the schedule
                  alert(`Click en las celdas del horario para asignar turnos a ${extra.nombre}`)
                }}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center gap-2"
              >
                <div className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
                  {extra.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span>{extra.nombre}</span>
                <span className="text-xs text-slate-400">({extra.turno})</span>
                <span className="text-xs font-mono text-slate-500">{extra.hora_inicio} - {extra.hora_fin}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
            Los extras se gestionan desde la página "Gestión Personal"
          </p>
        </div>
      )}

      {/* Cuadrante */}
      {viewMode === 'semana' ? (
        <div className="glass-panel bg-surface-light dark:bg-surface-dark rounded-2xl shadow-glass flex flex-col overflow-hidden">
          {/* Cabecera de dias */}
          <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-20 print:hidden">
            <div className="p-4 border-r border-slate-200 dark:border-slate-700 flex items-center">
              <div className="relative w-full">
                <span className="absolute left-2.5 top-2.5 material-symbols-rounded text-slate-400 text-sm">search</span>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="Buscar empleado..."
                  type="text"
                />
              </div>
            </div>

            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`p-3 text-center border-r border-slate-100 dark:border-slate-800/50 last:border-0 ${
                  [5, 6].includes(index) ? 'bg-orange-50/30 dark:bg-orange-900/10' : index === 0 ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                }`}
              >
                <p className="text-xs font-bold text-slate-400 uppercase">{format(day, 'EEE', { locale: es })}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{format(day, 'd')}</p>
              </div>
            ))}
          </div>

          {/* Filas */}
          <div className="overflow-y-auto flex-1 bg-white/30 dark:bg-slate-900/30">
            {loading ? (
              <div className="text-center py-20 text-slate-500">Cargando horarios...</div>
            ) : personas.length === 0 ? (
              <div className="text-center py-20 text-slate-500">No hay empleados en este local</div>
            ) : (
              personas.map((persona) => (
                <div
                  key={persona.id}
                  className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-slate-100 dark:border-slate-800 hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors group min-h-[110px]"
                >
                  <div className="p-4 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-center sticky left-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${persona.avatarColor} flex items-center justify-center font-bold text-sm shrink-0`}>
                      {getInitials(persona.nombre)}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate flex items-center gap-1">
                        {persona.nombre}
                        {persona.puesto && <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{persona.puesto}</span>}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {persona.puesto ? `${persona.puesto} • ` : ''}
                        {persona.puesto ? `${persona.puesto} • ` : ''}
                        {persona.turno || 'Sin turno'} {persona.tipo === 'extra' ? '• Extra' : ''}
                      </p>
                    </div>
                  </div>
                      <div className="mt-2 flex gap-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        {getPersonaHours(persona) || '—'}
                      </span>
                      {persona.tipo === 'extra' ? (
                        <button
                          onClick={() => handleDeleteExtra((persona as any).id)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300 hover:underline"
                        >
                          borrar
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          Activo
                        </span>
                      )}
                    </div>
                  </div>

                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const turno = getTurnoForDay(persona.nombre, dayIndex)
                    return (
                      <div key={dayIndex} className="border-r border-slate-100 dark:border-slate-700/50 p-1 relative group/cell">
                        {turno ? (
                          <div
                            className={`shift-card w-full h-full ${getTurnoColor(turno.turno)} border rounded-lg p-2 flex flex-col justify-between relative z-10 group`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold uppercase tracking-wide">{turno.turno}</span>
                              <button
                                onClick={() => handleDeleteTurno(persona.nombre, dayIndex)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              >
                                <span className="material-symbols-rounded text-xs text-red-600 dark:text-red-400">close</span>
                              </button>
                            </div>
                            {persona.puesto && (
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-200">
                                {persona.puesto}
                              </div>
                            )}
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-50">
                              {turno.horas || getPersonaHours(persona, turno.turno) || '—'}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                          let horasCustom = getPersonaHours(persona) || ''

                          handleAddTurno(persona.nombre, dayIndex, persona.turno || 'Manana', horasCustom)
                        }}
                            className="absolute inset-0 m-auto w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-0 group-hover/cell:opacity-100 hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm z-0"
                          >
                            <span className="material-symbols-rounded text-sm">add</span>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white/30 dark:bg-slate-900/30 print:hidden">
            <button
              onClick={() => setShowExtraModal(true)}
              className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded">person_add</span>
              Añadir extra
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel bg-surface-light dark:bg-surface-dark rounded-2xl shadow-glass p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(startOfMonth(addDays(currentMonth, -1)))}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500"
              >
                <span className="material-symbols-rounded">chevron_left</span>
              </button>
              <div className="text-lg font-semibold text-slate-800 dark:text-white">
                {format(currentMonth, 'LLLL yyyy', { locale: es })}
              </div>
              <button
                onClick={() => setCurrentMonth(startOfMonth(addDays(endOfMonth(currentMonth), 1)))}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500"
              >
                <span className="material-symbols-rounded">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 mb-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayTurnos = turnos.filter((t) => t.fecha === dateStr)
              return (
                <div
                  key={dateStr}
                  className="min-h-[120px] rounded-xl border border-slate-100 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-2 flex flex-col gap-1"
                >
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{format(day, 'd')}</div>
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayTurnos.length === 0 ? (
                      <div className="text-[10px] text-slate-400">Sin turnos</div>
                    ) : (
                      dayTurnos.slice(0, 4).map((t) => (
                        <div key={t.id} className={`rounded-lg border text-[10px] px-2 py-1 ${getTurnoColor(t.turno)}`}>
                          <div className="font-bold truncate">{t.empleado}</div>
                          <div className="font-semibold">
                            {t.turno} {t.horas ? `• ${t.horas}` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showExtraModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Nuevo Extra</p>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Añadir extra al cuadrante</h3>
              </div>
              <button
                onClick={() => setShowExtraModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nombre</label>
                <input
                  value={newExtra.nombre || ''}
                  onChange={(e) => setNewExtra({ ...newExtra, nombre: e.target.value })}
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:text-white"
                  placeholder="Ej: Refuerzo terraza"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Puesto</label>
                <select
                  value={newExtra.puesto}
                  onChange={(e) => setNewExtra({ ...newExtra, puesto: e.target.value })}
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:text-white"
                >
                  {puestoOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Teléfono</label>
                <input
                  value={newExtra.telefono || ''}
                  onChange={(e) => setNewExtra({ ...newExtra, telefono: e.target.value })}
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:text-white"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Turno</label>
                <select
                  value={newExtra.turno}
                  onChange={(e) => setNewExtra({ ...newExtra, turno: e.target.value })}
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:text-white"
                >
                  <option value="Manana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Extra">Extra</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Hora inicio</label>
                <input
                  type="time"
                  value={newExtra.hora_inicio || '09:00'}
                  onChange={(e) => setNewExtra({ ...newExtra, hora_inicio: e.target.value })}
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Hora fin</label>
                <input
                  type="time"
                  value={newExtra.hora_fin || '15:00'}
                  onChange={(e) => setNewExtra({ ...newExtra, hora_fin: e.target.value })}
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowExtraModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateExtra}
                className="px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <span className="material-symbols-rounded text-sm">save</span>
                Guardar extra
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
