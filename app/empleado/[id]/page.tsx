'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/MainLayout'
import { supabase, type Empleado } from '@/lib/supabase'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  differenceInYears,
  differenceInMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'

export default function FichaEmpleado() {
  const params = useParams()
  const router = useRouter()
  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [vacacionesDias, setVacacionesDias] = useState<string[]>([])
  const [documentos, setDocumentos] = useState<{ name: string; url: string; size?: number }[]>(
    []
  )
  const puestoOptions = ['Camarero', 'Encargado', 'Cocinero', 'Ayudante de cocina', 'Jefe de cocina']

  useEffect(() => {
    if (params.id) {
      fetchEmpleado()
    }
  }, [params.id])

  const fetchEmpleado = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setEmpleado(data)
      if (data?.vacaciones_dias) {
        try {
          const parsed = JSON.parse(data.vacaciones_dias)
          if (Array.isArray(parsed)) setVacacionesDias(parsed)
        } catch (err) {
          console.warn('No se pudo parsear vacaciones_dias', err)
        }
      } else {
        setVacacionesDias([])
      }
      if (data?.documentos) {
        try {
          // Intenta parsear como JSON primero
          const parsed = JSON.parse(data.documentos)
          if (Array.isArray(parsed)) {
            setDocumentos(parsed)
          }
        } catch (err) {
          // Si falla, intenta parsear formato antiguo: "nombre | url, nombre2 | url2"
          try {
            const docs = data.documentos.split(',').map((item: string) => {
              const parts = item.trim().split('|')
              if (parts.length >= 2) {
                const name = parts[0].trim()
                const url = parts[1].trim()
                return { name, url, size: undefined }
              }
              return null
            }).filter(Boolean)
            setDocumentos(docs as any[])
          } catch (parseErr) {
            console.warn('No se pudo parsear documentos en ningún formato', parseErr)
            setDocumentos([])
          }
        }
      } else {
        setDocumentos([])
      }
      if (data?.vacaciones_dias) {
        try {
          const parsed = JSON.parse(data.vacaciones_dias)
          if (Array.isArray(parsed)) {
            setVacacionesDias(parsed)
          }
        } catch (err) {
          console.warn('No se pudo parsear vacaciones_dias', err)
          setVacacionesDias([])
        }
      } else {
        setVacacionesDias([])
      }
    } catch (error) {
      console.error('Error fetching empleado:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!empleado) return

    const vacacionesTomadas = vacacionesDias.length
    const vacacionesRestantes = Math.max(0, 30 - vacacionesTomadas)
    const payload = {
      ...empleado,
      vacaciones_dias: JSON.stringify(vacacionesDias),
      vacaciones_tomadas: vacacionesTomadas,
      vacaciones_restantes: vacacionesRestantes,
    }

    try {
      const { error } = await supabase
        .from('empleados')
        .update(payload)
        .eq('id', empleado.id)

      if (error) throw error
      alert('Empleado actualizado correctamente')
      setEmpleado(payload)
      setEditMode(false)
    } catch (error) {
      console.error('Error updating empleado:', error)
      alert('Error al actualizar empleado')
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este empleado?')) return

    try {
      const { error } = await supabase.from('empleados').delete().eq('id', params.id)
      if (error) throw error
      router.push('/')
    } catch (error) {
      console.error('Error deleting empleado:', error)
      alert('Error al eliminar empleado')
    }
  }

  const getInitials = (nombre: string) => {
    return nombre
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isDaySelected = (date: Date) => {
    const iso = format(date, 'yyyy-MM-dd')
    return vacacionesDias.includes(iso)
  }

  const toggleDia = async (date: Date) => {
    const iso = format(date, 'yyyy-MM-dd')
    const already = vacacionesDias.includes(iso)
    const next = already ? vacacionesDias.filter((d) => d !== iso) : [...vacacionesDias, iso]
    setVacacionesDias(next)
    if (empleado) {
      const payload = {
        vacaciones_dias: JSON.stringify(next),
        vacaciones_tomadas: next.length,
        vacaciones_restantes: Math.max(0, 30 - next.length),
      }
      setEmpleado({
        ...empleado,
        ...payload,
      })
      try {
        await supabase.from('empleados').update(payload).eq('id', empleado.id)
      } catch (err) {
        console.error('No se pudo guardar vacaciones', err)
        alert('No se pudieron guardar las vacaciones')
      }
    }
  }

  const calcularAntiguedad = (emp: Empleado | null) => {
    const startStr = emp?.fecha_inicio || emp?.created_at
    if (!startStr) return '-'
    const start = new Date(startStr)
    if (isNaN(start.getTime())) return '-'
    const now = new Date()
    const years = Math.max(0, differenceInYears(now, start))
    const monthsTotal = Math.max(0, differenceInMonths(now, start))
    const monthsRemainder = Math.max(0, monthsTotal - years * 12)
    const parts: string[] = []
    if (years > 0) parts.push(`${years} ${years === 1 ? 'Año' : 'Años'}`)
    if (monthsRemainder > 0)
      parts.push(`${monthsRemainder} ${monthsRemainder === 1 ? 'mes' : 'meses'}`)
    if (parts.length === 0) return 'Menos de 1 mes'
    return parts.join(' ')
  }

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const goMonth = (delta: number) => {
    setCurrentMonth(addMonths(currentMonth, delta))
  }

  const handleUploadDocs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!empleado) return
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const uploads: { name: string; url: string; size?: number }[] = []
      for (const file of Array.from(files)) {
        const path = `${empleado.id}/${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('empleados-docs')
          .upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('empleados-docs').getPublicUrl(path)
        uploads.push({ name: file.name, url: data.publicUrl, size: file.size })
      }
      const nextDocs = [...documentos, ...uploads]
      setDocumentos(nextDocs)
      await supabase
        .from('empleados')
        .update({ documentos: JSON.stringify(nextDocs) })
        .eq('id', empleado.id)
      alert('Documentos subidos')
    } catch (err) {
      console.error('Error subiendo documentos', err)
      alert('No se pudieron subir los documentos')
    }
  }

  const handleOpenDoc = (url: string) => {
    window.open(url, '_blank')
  }

  const handleDeleteDoc = async (docUrl: string, docName: string) => {
    if (!empleado) return
    if (!confirm(`¿Eliminar documento "${docName}"?`)) return

    try {
      // Remove from storage
      const path = `${empleado.id}/${docName}`
      const { error: deleteError } = await supabase.storage
        .from('empleados-docs')
        .remove([path])

      if (deleteError) throw deleteError

      // Update documentos array
      const nextDocs = documentos.filter(d => d.url !== docUrl)
      setDocumentos(nextDocs)

      await supabase
        .from('empleados')
        .update({ documentos: JSON.stringify(nextDocs) })
        .eq('id', empleado.id)

      alert('Documento eliminado')
    } catch (err) {
      console.error('Error eliminando documento', err)
      alert('No se pudo eliminar el documento')
    }
  }

  if (loading) {
    return (
      <MainLayout
        title="Ficha de Empleado"
        subtitle="Cargando..."
        localName={empleado?.locale || undefined}
        showBackButton
      >
        <div className="text-center py-20">Cargando empleado...</div>
      </MainLayout>
    )
  }

  if (!empleado) {
    return (
      <MainLayout
        title="Ficha de Empleado"
        subtitle="No encontrado"
        showBackButton
      >
        <div className="text-center py-20">Empleado no encontrado</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      title="Ficha de Empleado"
      subtitle="Detalle completo e historial"
        localName={empleado?.locale || undefined}
      showBackButton
    >
      {/* Cabecera del Empleado */}
      <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-lg border-4 border-white dark:border-slate-700">
              <div className="w-full h-full bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-bold">
                {getInitials(empleado.nombre)}
              </div>
            </div>
            <button className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary-dark">
              <span className="material-symbols-rounded text-sm">photo_camera</span>
            </button>
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
                {empleado.nombre}
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-full text-xs font-semibold uppercase tracking-wide">
                Activo
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {empleado.puesto ? `${empleado.puesto} • ` : ''}
              {empleado.turno || 'Sin turno'} • {empleado.locale}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex gap-4">
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 border border-white/50 dark:border-slate-700/50 flex-1 md:w-32 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  Vac. Restantes
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {empleado.vacaciones_restantes || 0}
                </p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 border border-white/50 dark:border-slate-700/50 flex-1 md:w-32 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  Antigüedad
                </p>
                <p className="text-xl font-bold text-primary">
                  {calcularAntiguedad(empleado)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                onClick={editMode ? handleSave : () => setEditMode(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
              >
                <span className="material-symbols-rounded text-sm">
                  {editMode ? 'save' : 'edit'}
                </span>
                {editMode ? 'Guardar' : 'Editar'}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center justify-center p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-rounded">delete</span>
              </button>
              <button className="flex items-center justify-center p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                <span className="material-symbols-rounded">print</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Información Laboral */}
          <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 text-primary dark:bg-blue-900/30">
                  <span className="material-symbols-rounded text-sm">work</span>
                </span>
                Información Laboral
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Puesto
                </label>
                <select
                  disabled={!editMode}
                  value={empleado.puesto || ''}
                  onChange={(e) => setEmpleado({ ...empleado, puesto: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-50"
                >
                  <option value="">Sin puesto</option>
                  {puestoOptions.map((puesto) => (
                    <option key={puesto} value={puesto}>
                      {puesto}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Tipo de Contrato
                </label>
                <input
                  disabled={!editMode}
                  value={empleado.contrato}
                  onChange={(e) =>
                    setEmpleado({ ...empleado, contrato: e.target.value })
                  }
                  autoComplete="off"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Fecha de inicio
                </label>
                <input
                  disabled={!editMode}
                  type="date"
                  value={empleado.fecha_inicio ? empleado.fecha_inicio.slice(0, 10) : ''}
                  onChange={(e) =>
                    setEmpleado({
                      ...empleado,
                      fecha_inicio: e.target.value || undefined,
                    })
                  }
                  autoComplete="off"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Turno
                </label>
                <select
                  disabled={!editMode}
                  value={empleado.turno || 'Manana'}
                  onChange={(e) => setEmpleado({ ...empleado, turno: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-50"
                >
                  <option value="Manana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Sueldo Mensual Neto
                </label>
                <div className="relative">
                  <input
                    disabled={!editMode}
                    type="number"
                    value={empleado.sueldo}
                    onChange={(e) =>
                      setEmpleado({ ...empleado, sueldo: Number(e.target.value) })
                    }
                    autoComplete="off"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pl-8 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-50"
                  />
                  <span className="material-symbols-rounded absolute left-2.5 top-3 text-slate-400 text-sm">
                    euro
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  IBAN
                </label>
                <input
                  disabled={!editMode}
                  value={empleado.iban || ''}
                  onChange={(e) => setEmpleado({ ...empleado, iban: e.target.value })}
                  autoComplete="off"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white font-mono text-sm disabled:opacity-50"
                  placeholder="ES98 2038 5778 9830 1234 5678"
                />
              </div>
            </div>
          </section>

          {/* Datos Personales */}
          <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                  <span className="material-symbols-rounded text-sm">person</span>
                </span>
                Datos Personales
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  DNI / NIE
                </label>
                <input
                  disabled={!editMode}
                  value={empleado.dni}
                  onChange={(e) => setEmpleado({ ...empleado, dni: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Local Asignado
                </label>
                <select
                  disabled={!editMode}
                  value={empleado.locale}
                  onChange={(e) => setEmpleado({ ...empleado, locale: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-50"
                >
                  <option>Brutal Soul</option>
                  <option>Stella Brutal</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Gestión de Vacaciones */}
          <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                Gestión de Vacaciones
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goMonth(-1)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <span className="material-symbols-rounded text-sm">chevron_left</span>
                </button>
                <button
                  onClick={() => goMonth(1)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <span className="material-symbols-rounded text-sm">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-center mb-4">
                <p className="font-semibold text-slate-800 dark:text-white text-sm">
                  {format(currentMonth, 'LLLL yyyy', { locale: es })}
                </p>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                  <span
                    key={day}
                    className="text-center text-[10px] text-slate-400 font-bold uppercase"
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {daysInMonth.map((day) => {
                  const selected = isDaySelected(day)
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => editMode && toggleDia(day)}
                      disabled={!editMode}
                      className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-colors border ${
                        selected
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-transparent'
                      } ${!editMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  Seleccionadas: {vacacionesDias.length}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Restantes: {Math.max(0, 30 - vacacionesDias.length)}
                </p>
              </div>
            </div>
          </section>

          {/* Documentación */}
          <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                Documentación
              </h3>
              <label
                htmlFor="doc-upload"
                className="text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-rounded">add_circle</span>
                Subir
              </label>
              <input
                id="doc-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleUploadDocs}
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors mb-4 group">
              <span className="material-symbols-rounded text-slate-400 group-hover:text-primary transition-colors">
                cloud_upload
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Arrastra archivos aquí o pulsa “Subir”
              </p>
            </div>

            <div className="space-y-2">
              {documentos.length === 0 ? (
                <p className="text-xs text-slate-500">Sin documentos</p>
              ) : (
                documentos.map((doc) => (
                  <div
                    key={doc.url}
                    className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group"
                  >
                    <button
                      onClick={() => handleOpenDoc(doc.url)}
                      className="flex items-center gap-3 overflow-hidden flex-1 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded text-sm">insert_drive_file</span>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {doc.name}
                        </p>
                        {doc.size && (
                          <p className="text-[10px] text-slate-400">
                            {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenDoc(doc.url)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-rounded text-sm">open_in_new</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.url, doc.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-rounded text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Notas Internas */}
          <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-4">
              Notas Internas
            </h3>
            <div className="relative">
              <textarea
                disabled={!editMode}
                value={empleado.notas || ''}
                onChange={(e) => setEmpleado({ ...empleado, notas: e.target.value })}
                className="w-full bg-yellow-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-yellow-400/50 resize-none h-32 shadow-inner placeholder-yellow-700/30 dark:placeholder-slate-500"
                placeholder="Escribir nota..."
              />
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
