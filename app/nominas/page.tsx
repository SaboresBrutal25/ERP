'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase, type Empleado, type Nomina } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type UploadActivity = { name: string; status: 'subiendo' | 'ok' | 'error'; progress?: number; time?: string; url?: string; path?: string }

export default function GestionNominas() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [selectedLocal, setSelectedLocal] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [periodo, setPeriodo] = useState({
    inicio: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    fin: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
    label: format(new Date(), 'MMMM yyyy', { locale: es })
  })
  const [activities, setActivities] = useState<UploadActivity[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)
  const [modalData, setModalData] = useState({ importe_ingresado: '', importe_efectivo: '', notas: '' })

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
    fetchEmpleados()
    fetchNominas()
  }, [selectedLocal, periodo])

  const changeMes = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
    setPeriodo({
      inicio: format(new Date(newDate.getFullYear(), newDate.getMonth(), 1), 'yyyy-MM-dd'),
      fin: format(new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0), 'yyyy-MM-dd'),
      label: format(newDate, 'MMMM yyyy', { locale: es })
    })
  }

  const fetchEmpleados = async () => {
    if (!selectedLocal) return
    setLoading(true)
    try {
      const { data, error } = await supabase.from('empleados').select('*').eq('locale', selectedLocal)
      if (error) throw error
      setEmpleados(data || [])
    } catch (error) {
      console.error('Error fetching empleados:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNominas = async () => {
    if (!selectedLocal) return
    try {
      const { data, error } = await supabase
        .from('nominas')
        .select('*')
        .gte('periodo_inicio', periodo.inicio)
        .lte('periodo_fin', periodo.fin)
      if (error) throw error
      const rows = data || []
      setNominas(rows)

      // Reflejar en actividad reciente los documentos ya subidos
      const activityFromNominas: UploadActivity[] = rows
        .filter((n) => n.file_url)
        .map((n) => ({
          name: n.file_url?.split('/').pop() || 'archivo.pdf',
          status: 'ok',
          progress: 100,
          time: undefined,
          url: n.file_url || undefined,
          path: extractPathFromUrl(n.file_url || undefined) || undefined,
        }))
      setActivities((prev) => {
        // Evita duplicados por nombre+url
        const map = new Map<string, UploadActivity>()
        for (const a of [...activityFromNominas, ...prev]) {
          map.set(`${a.name}-${a.url || ''}`, a)
        }
        return Array.from(map.values())
      })
    } catch (err) {
      console.error('Error fetch nominas', err)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      Enviada: 'bg-green-100 text-green-700 border border-green-200',
      Subida: 'bg-blue-100 text-blue-700 border border-blue-200',
      Pendiente: 'bg-amber-100 text-amber-700 border border-amber-200',
    }
    return map[estado] || map.Pendiente
  }

  const safeFileName = (name: string) =>
    name
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      || 'archivo.pdf'

  const extractPathFromUrl = (url?: string) => {
    if (!url) return null
    const marker = '/nominas/'
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return url.substring(idx + marker.length)
  }

  const handleSaveManualNomina = async () => {
    if (!selectedEmpleado) return

    const importeIngresado = parseFloat(modalData.importe_ingresado) || 0
    const importeEfectivo = parseFloat(modalData.importe_efectivo) || 0
    const importeTotal = importeIngresado + importeEfectivo

    try {
      const existing = nominas.find((n) => n.empleado_id === selectedEmpleado.id && n.periodo_inicio === periodo.inicio && n.periodo_fin === periodo.fin)
      const payload = {
        empleado_id: selectedEmpleado.id,
        empleado_nombre: selectedEmpleado.nombre,
        periodo_inicio: periodo.inicio,
        periodo_fin: periodo.fin,
        importe: importeTotal,
        importe_ingresado: importeIngresado,
        importe_efectivo: importeEfectivo,
        estado: 'Subida',
        file_url: existing?.file_url || null,
      }

      const upsert = async () => {
        if (existing) {
          return supabase.from('nominas').update(payload).eq('id', existing.id)
        }
        return supabase.from('nominas').insert([payload])
      }

      let { error } = await upsert()
      if (error && (error.message?.includes('importe_ingresado') || error.message?.includes('importe_efectivo'))) {
        // Fallback si la tabla aún no tiene las columnas nuevas
        const legacyPayload: any = {
          empleado_id: selectedEmpleado.id,
          empleado_nombre: selectedEmpleado.nombre,
          periodo_inicio: periodo.inicio,
          periodo_fin: periodo.fin,
          importe: importeTotal,
          estado: 'Subida',
          file_url: existing?.file_url || null,
        }
        error = undefined
        if (existing) {
          const res = await supabase.from('nominas').update(legacyPayload).eq('id', existing.id)
          error = res.error || undefined
        } else {
          const res = await supabase.from('nominas').insert([legacyPayload])
          error = res.error || undefined
        }
        if (error) throw error
      } else if (error) {
        throw error
      }

      setShowModal(false)
      setModalData({ importe_ingresado: '', importe_efectivo: '', notas: '' })
      setSelectedEmpleado(null)
      await fetchNominas()
      alert('Nómina registrada correctamente')
    } catch (err) {
      console.error('Error guardando nómina manual', err)
      alert(`No se pudo guardar la nómina: ${(err as any)?.message || 'Error desconocido'}`)
    }
  }

  const handleDeleteNomina = async (empleadoId: string) => {
    const target = nominas.find((n) => n.empleado_id === empleadoId && n.periodo_inicio === periodo.inicio && n.periodo_fin === periodo.fin)
    if (!target) return
    if (!confirm('¿Eliminar/restablecer la nómina de este periodo?')) return
    try {
      const { error } = await supabase.from('nominas').delete().eq('id', target.id)
      if (error) throw error
      await fetchNominas()
      alert('Nómina eliminada. Estado restablecido a pendiente.')
    } catch (err) {
      console.error('Error eliminando nómina', err)
      alert('No se pudo eliminar la nómina')
    }
  }

  const openModalForEmpleado = (empleado: Empleado) => {
    setSelectedEmpleado(empleado)
    const existing = nominas.find((n) => n.empleado_id === empleado.id && n.periodo_inicio === periodo.inicio && n.periodo_fin === periodo.fin)
    setModalData({
      importe_ingresado: existing?.importe_ingresado?.toString() || '',
      importe_efectivo: existing?.importe_efectivo?.toString() || '',
      notas: '',
    })
    setShowModal(true)
  }

  const calculatePayrollDetails = (sueldo: number) => {
    const sueldoBrutoMensual = sueldo / 12
    const seguridadSocial = sueldoBrutoMensual * 0.0635 // 6.35% employee contribution
    const irpf = sueldoBrutoMensual * 0.15 // Simplified 15% IRPF
    const sueldoNeto = sueldoBrutoMensual - seguridadSocial - irpf

    return {
      sueldoBrutoMensual: sueldoBrutoMensual.toFixed(2),
      seguridadSocial: seguridadSocial.toFixed(2),
      irpf: irpf.toFixed(2),
      sueldoNeto: sueldoNeto.toFixed(2),
    }
  }

  const generatePayrollPDF = async (empleado: Empleado) => {
    const doc = new jsPDF('portrait', 'mm', 'a4')
    const details = calculatePayrollDetails(empleado.sueldo)

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('NÓMINA', 105, 20, { align: 'center' })

    // Company & period info
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Empresa: ${selectedLocal}`, 14, 35)
    doc.text(`Periodo: ${format(new Date(periodo.inicio), 'MMMM yyyy', { locale: es })}`, 14, 42)

    // Employee info
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL TRABAJADOR', 14, 55)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${empleado.nombre}`, 14, 62)
    doc.text(`DNI: ${empleado.dni}`, 14, 69)
    doc.text(`Puesto: ${empleado.puesto || 'N/A'}`, 14, 76)
    doc.text(`Contrato: ${empleado.contrato}`, 14, 83)

    // Payroll table
    const tableData = [
      ['CONCEPTOS', 'DEVENGOS', 'DEDUCCIONES'],
      ['Sueldo Base', `€${details.sueldoBrutoMensual}`, ''],
      ['Seguridad Social (6.35%)', '', `€${details.seguridadSocial}`],
      ['IRPF (15%)', '', `€${details.irpf}`],
      ['', '', ''],
      [
        'TOTAL',
        `€${details.sueldoBrutoMensual}`,
        `€${(parseFloat(details.seguridadSocial) + parseFloat(details.irpf)).toFixed(2)}`,
      ],
      ['', '', ''],
      ['LÍQUIDO A PERCIBIR', `€${details.sueldoNeto}`, ''],
    ]

    autoTable(doc, {
      startY: 95,
      head: [tableData[0]],
      body: tableData.slice(1),
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 50, halign: 'right' },
      },
      didParseCell: function (data) {
        if (data.row.index === tableData.length - 2) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [240, 240, 240]
        }
      },
    })

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.setFontSize(9)
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, finalY)
    doc.text(`IBAN: ${empleado.iban || 'No especificado'}`, 14, finalY + 7)

    // Upload to storage and save to DB
    const filename = `nomina_${empleado.nombre.replace(/\s/g, '_')}_${format(
      new Date(periodo.inicio),
      'yyyy-MM'
    )}.pdf`
    const safePath = `${selectedLocal.replace(/\s+/g, '_')}/${safeFileName(filename)}`
    const pdfBlob = doc.output('blob')

    try {
      const { error: uploadError } = await supabase.storage.from('nominas').upload(safePath, pdfBlob, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('nominas').getPublicUrl(safePath)

      // Save to database
      const basePayload = {
        empleado_id: empleado.id,
        empleado_nombre: empleado.nombre,
        periodo_inicio: periodo.inicio,
        periodo_fin: periodo.fin,
        importe: empleado.sueldo / 12,
        importe_ingresado: empleado.sueldo / 12,
        importe_efectivo: 0,
        estado: 'Subida',
        file_url: data.publicUrl,
      }

      const existing = nominas.find((n) => n.empleado_id === empleado.id && n.periodo_inicio === periodo.inicio && n.periodo_fin === periodo.fin)
      const tryUpsert = async (payload: any) => {
        if (existing) {
          return supabase.from('nominas').update(payload).eq('id', existing.id)
        }
        return supabase.from('nominas').insert([payload])
      }

      let { error: nominaError } = await tryUpsert(basePayload)
      if (nominaError && (nominaError.message?.includes('importe_ingresado') || nominaError.message?.includes('importe_efectivo'))) {
        const legacyPayload: any = {
          empleado_id: empleado.id,
          empleado_nombre: empleado.nombre,
          periodo_inicio: periodo.inicio,
          periodo_fin: periodo.fin,
          importe: empleado.sueldo / 12,
          estado: 'Subida',
          file_url: data.publicUrl,
        }
        const res = await tryUpsert(legacyPayload)
        if (res.error) throw res.error
      } else if (nominaError) {
        throw nominaError
      }

      await fetchNominas()
      alert(`Nómina generada para ${empleado.nombre}`)
    } catch (err) {
      console.error('Error generando nómina', err)
      alert('No se pudo generar la nómina')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const now = new Date()
    const timeStr = now.toLocaleTimeString()

    for (const file of Array.from(files)) {
      setActivities((prev) => [...prev, { name: file.name, status: 'subiendo', progress: 10, time: timeStr }])
      try {
        const pathSafe = `${selectedLocal.replace(/\s+/g, '_')}/${safeFileName(file.name)}`
        const { error: uploadError } = await supabase.storage.from('nominas').upload(pathSafe, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('nominas').getPublicUrl(pathSafe)

        // Vincular a primer empleado (o placeholder)
        const empleado = empleados[0]
        const insertNomina = {
          empleado_id: empleado?.id || '00000000-0000-0000-0000-000000000000',
          empleado_nombre: empleado?.nombre || 'Desconocido',
          periodo_inicio: periodo.inicio,
          periodo_fin: periodo.fin,
          importe: empleado?.sueldo || null,
          importe_ingresado: null,
          importe_efectivo: null,
          estado: 'Subida',
          file_url: data.publicUrl,
        }
        const { error: nominaError } = await supabase.from('nominas').insert([insertNomina])
        if (nominaError && nominaError.message?.includes('importe_efectivo')) {
          const legacyPayload: any = {
            empleado_id: insertNomina.empleado_id,
            empleado_nombre: insertNomina.empleado_nombre,
            periodo_inicio: insertNomina.periodo_inicio,
            periodo_fin: insertNomina.periodo_fin,
            importe: insertNomina.importe,
            estado: insertNomina.estado,
            file_url: insertNomina.file_url,
          }
          const res = await supabase.from('nominas').insert([legacyPayload])
          if (res.error) throw res.error
        } else if (nominaError) {
          throw nominaError
        }
        setActivities((prev) =>
          prev.map((a) =>
            a.name === file.name ? { ...a, status: 'ok', progress: 100, url: data.publicUrl, path: pathSafe } : a
          )
        )
        fetchNominas()
      } catch (err) {
        console.error('Upload error', err)
        if ((err as any)?.message?.includes('row-level security')) {
          alert('El bucket "nominas" tiene RLS y bloquea subidas. Crea políticas de inserción/lectura para usuarios anónimos o autenticados en storage.objects.')
        }
        // Si falla el insert por columnas faltantes, considera la subida como correcta para no bloquear
        if ((err as any)?.message?.includes('importe_efectivo') || (err as any)?.message?.includes('importe_ingresado')) {
        setActivities((prev) =>
          prev.map((a) =>
            a.name === file.name ? { ...a, status: 'ok', progress: 100, url: undefined, path: undefined } : a
          )
        )
      } else {
        setActivities((prev) =>
          prev.map((a) => (a.name === file.name ? { ...a, status: 'error', progress: 0 } : a))
        )
        }
      }
    }
  }

  const handleLocalChange = (local: string) => {
    setSelectedLocal(local)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLocal', local)
    }
  }

  return (
    <MainLayout title="Gestión de Nóminas" subtitle="Administración y distribución de salarios" localName={selectedLocal} onLocalChange={handleLocalChange}>
      <div className="flex flex-col md:flex-row gap-6 h-full">
        {/* Panel izquierdo */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-6 shrink-0">
          <div className="glass-panel bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-glass relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Subir Nóminas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Arrastra archivos PDF para procesarlos.</p>

            <label
              htmlFor="nomina-upload"
              className="h-48 rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer mb-6 group border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary bg-slate-50/50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
            >
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-rounded text-3xl">cloud_upload</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Arrastra tus archivos aquí</p>
              <p className="text-xs text-slate-400 mt-1">Soporta PDF hasta 10MB</p>
            </label>
            <input id="nomina-upload" type="file" className="hidden" accept=".pdf" multiple onChange={handleFileUpload} />
            <button
              onClick={() => document.getElementById('nomina-upload')?.click()}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded">folder_open</span>
              Explorar Archivos
            </button>
          </div>

          <div className="glass-panel bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-glass flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Actividad Reciente</h3>
              <span className="text-xs font-medium text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                Hoy
              </span>
            </div>
            <div className="overflow-y-auto pr-2 space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">Sin actividad</div>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.name}
                    className={`p-3 rounded-xl border shadow-sm ${
                      act.status === 'ok'
                        ? 'bg-green-50 border-green-200'
                        : act.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded text-lg">picture_as_pdf</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{act.name}</p>
                          {act.progress !== undefined && <span className="text-xs font-bold text-blue-600">{act.progress}%</span>}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {act.status === 'subiendo'
                            ? 'Subiendo archivo...'
                            : act.status === 'ok'
                            ? 'Procesado correctamente'
                            : 'Error al subir'}
                        </p>
                        {act.time && <p className="text-[10px] text-slate-400 mt-1">{act.time}</p>}
                        {act.url && (
                          <a
                            href={act.url}
                            target="_blank"
                            className="text-xs font-semibold text-primary hover:underline block mt-1"
                          >
                            Abrir PDF
                          </a>
                        )}
                      </div>
                      {(act.path || act.url) && (
                        <button
                          onClick={async () => {
                            if (!confirm('¿Eliminar este PDF de la actividad y del bucket?')) return
                            try {
                              if (act.path) {
                                const { error } = await supabase.storage.from('nominas').remove([act.path])
                                if (error) throw error
                              } else if (act.url) {
                                const path = extractPathFromUrl(act.url)
                                if (path) {
                                  const { error } = await supabase.storage.from('nominas').remove([path])
                                  if (error) throw error
                                }
                              }
                            } catch (err) {
                              console.error('No se pudo eliminar el archivo del bucket', err)
                              alert('No se pudo eliminar el archivo del bucket')
                            } finally {
                              setActivities((prev) => prev.filter((a) => a !== act))
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                          title="Eliminar PDF"
                        >
                          <span className="material-symbols-rounded text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex-1 glass-panel bg-surface-light dark:bg-surface-dark rounded-2xl shadow-glass flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                  onClick={() => changeMes(-1)}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-rounded">chevron_left</span>
                </button>
                <span className="text-sm font-bold text-slate-800 dark:text-white px-2 capitalize">{periodo.label}</span>
                <button
                  onClick={() => changeMes(1)}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-rounded">chevron_right</span>
                </button>
              </div>
              <div className="relative flex-1 md:w-64">
                <span className="absolute left-3 top-2.5 material-symbols-rounded text-slate-400 text-sm">search</span>
                <input
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Buscar empleado..."
                  type="text"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider hover:text-primary transition-colors">
                <span className="material-symbols-rounded text-base">filter_list</span>
                Filtrar
              </button>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-6 py-3 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Empleado</div>
            <div className="col-span-2">Periodo</div>
            <div className="col-span-2">Ingresado</div>
            <div className="col-span-2">Efectivo</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-1 text-right pr-2">Acciones</div>
          </div>

          <div className="overflow-y-auto flex-1 p-2">
            <div className="space-y-1">
              {loading ? (
                <div className="text-center py-20 text-slate-500">Cargando nóminas...</div>
              ) : empleados.length === 0 ? (
                <div className="text-center py-20 text-slate-500">No hay empleados en este local</div>
              ) : (
                empleados.map((empleado) => {
                  const nomina = nominas.find((n) => n.empleado_id === empleado.id && n.periodo_inicio === periodo.inicio && n.periodo_fin === periodo.fin)
                  const estado = nomina?.estado || 'Pendiente'
                  const importe = nomina?.importe
                  const ingresadoNum = Number(nomina?.importe_ingresado ?? importe ?? 0)
                  const efectivoNum = Number(nomina?.importe_efectivo ?? 0)
                  const periodoLabel = `${format(new Date(periodo.inicio), 'dd MMM')} - ${format(new Date(periodo.fin), 'dd MMM')}`
                  return (
                    <div
                      key={empleado.id}
                      className="group flex items-center grid grid-cols-12 gap-4 px-4 py-3 bg-white dark:bg-slate-900/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 rounded-xl transition-all duration-200"
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {empleado.nombre
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{empleado.nombre}</h4>
                          <p className="text-xs text-slate-500">
                            {empleado.puesto || 'Sin puesto'} • DNI: {empleado.dni}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center text-sm text-slate-600 dark:text-slate-300">{periodoLabel}</div>

                      <div className="col-span-2 flex items-center font-medium text-slate-800 dark:text-white">
                        {isNaN(ingresadoNum) ? '--' : `${ingresadoNum.toFixed(2)} €`}
                      </div>

                      <div className="col-span-2 flex items-center font-medium text-slate-800 dark:text-white">
                        {isNaN(efectivoNum) ? '--' : `${efectivoNum.toFixed(2)} €`}
                      </div>

                      <div className="col-span-1 flex items-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getEstadoBadge(estado)}`}>{estado}</span>
                      </div>

                      <div className="col-span-1 flex items-center justify-end gap-2 pr-2 whitespace-nowrap">
                        {nomina?.file_url && (
                          <a
                            href={nomina.file_url}
                            target="_blank"
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
                            title="Ver PDF"
                          >
                            <span className="material-symbols-rounded text-lg">visibility</span>
                          </a>
                        )}
                        {estado === 'Pendiente' && (
                          <button
                            onClick={() => generatePayrollPDF(empleado)}
                            className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                            title="Generar nómina automáticamente"
                          >
                            <span className="material-symbols-rounded text-lg">auto_awesome</span>
                          </button>
                        )}
                        <button
                          onClick={() => openModalForEmpleado(empleado)}
                          className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 transition-colors"
                          title="Editar/introducir datos manualmente"
                        >
                          <span className="material-symbols-rounded text-lg">edit_note</span>
                        </button>
                        {nomina && (
                          <button
                            onClick={() => handleDeleteNomina(empleado.id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                            title="Eliminar/restablecer nómina"
                          >
                            <span className="material-symbols-rounded text-lg">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">Mostrando {empleados.length} empleados activos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal introducción manual */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Introducir Nómina Manualmente</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {selectedEmpleado && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedEmpleado.nombre}</p>
                <p className="text-xs text-slate-500">{selectedEmpleado.puesto} • {periodo.label}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Importe Ingresado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={modalData.importe_ingresado}
                    onChange={(e) => setModalData({ ...modalData, importe_ingresado: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Importe en Efectivo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={modalData.importe_efectivo}
                    onChange={(e) => setModalData({ ...modalData, importe_efectivo: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Total: €{((parseFloat(modalData.importe_ingresado) || 0) + (parseFloat(modalData.importe_efectivo) || 0)).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveManualNomina}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-blue-500/20"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
