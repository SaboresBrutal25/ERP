'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase, type Empleado, type LocalHorario, type Extra } from '@/lib/supabase'
import Link from 'next/link'

export default function GestionPersonal() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [selectedLocal, setSelectedLocal] = useState<string>('')
  const puestoOptions = ['Camarero', 'Encargado', 'Cocinero', 'Ayudante de cocina', 'Jefe de cocina']
  const [filterPuesto, setFilterPuesto] = useState<string>('')
  const [sortBy, setSortBy] = useState<'none' | 'sueldo-asc' | 'sueldo-desc' | 'puesto-asc' | 'puesto-desc' | 'nombre-asc' | 'nombre-desc'>('none')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLocalChange = (local: string) => {
    setSelectedLocal(local)
    localStorage.setItem('selectedLocal', local)
  }
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Partial<Empleado>>({
    nombre: '',
    puesto: puestoOptions[0],
    dni: '',
    contrato: 'Indefinido',
    sueldo: 0,
    iban: '',
    turno: 'Manana',
    vacaciones_tomadas: 0,
    vacaciones_restantes: 30,
    locale: 'Brutal Soul',
  })
  const [horariosLocal, setHorariosLocal] = useState<LocalHorario>({
    locale: 'Brutal Soul',
    manana_inicio: '09:00',
    manana_fin: '15:00',
    tarde_inicio: '16:00',
    tarde_fin: '22:00',
    extra_inicio: '20:00',
    extra_fin: '02:00',
  })
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null)
  const [extraForm, setExtraForm] = useState<Partial<Extra>>({
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
    fetchEmpleados()
    fetchExtras()
    fetchHorariosLocal()
    setEditingExtraId(null)
  }, [selectedLocal])

  const fetchEmpleados = async () => {
    if (!selectedLocal) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('locale', selectedLocal)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmpleados(data || [])
    } catch (error) {
      console.error('Error fetching empleados:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExtras = async () => {
    if (!selectedLocal) return
    try {
      const { data, error } = await supabase
        .from('extras')
        .select('*')
        .eq('locale', selectedLocal)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExtras(data || [])
    } catch (error) {
      console.error('Error fetching extras:', error)
    }
  }

  const resetExtraForm = () => {
    setExtraForm({
      nombre: '',
      puesto: puestoOptions[0],
      telefono: '',
      turno: 'Manana',
      hora_inicio: '09:00',
      hora_fin: '15:00',
    })
  }

  const startEditExtra = (extra: Extra) => {
    setEditingExtraId(extra.id)
    setExtraForm({
      nombre: extra.nombre,
      puesto: extra.puesto || puestoOptions[0],
      telefono: extra.telefono || '',
      turno: extra.turno || 'Manana',
      hora_inicio: extra.hora_inicio || '09:00',
      hora_fin: extra.hora_fin || '15:00',
    })
  }

  const handleUpdateExtra = async () => {
    if (!editingExtraId) return
    try {
      if (!extraForm.nombre?.trim()) {
        alert('Introduce un nombre para el extra')
        return
      }
      const payload = {
        nombre: extraForm.nombre || '',
        puesto: extraForm.puesto || puestoOptions[0],
        telefono: extraForm.telefono || null,
        turno: extraForm.turno || 'Manana',
        hora_inicio: extraForm.hora_inicio || '09:00',
        hora_fin: extraForm.hora_fin || '15:00',
      }
      const { error } = await supabase.from('extras').update(payload).eq('id', editingExtraId)
      if (error) throw error
      resetExtraForm()
      setEditingExtraId(null)
      await fetchExtras()
    } catch (error) {
      console.error('Error updating extra:', error)
      alert('No se pudo actualizar el extra')
    }
  }

  const handleDeleteExtra = async (extraId: string, extraName?: string) => {
    if (!confirm(`¿Eliminar a ${extraName || 'este extra'}?`)) return
    try {
      const { error } = await supabase.from('extras').delete().eq('id', extraId)
      if (error) throw error
      if (editingExtraId === extraId) {
        setEditingExtraId(null)
        resetExtraForm()
      }
      await fetchExtras()
    } catch (err) {
      console.error('Error deleting extra:', err)
      alert('No se pudo eliminar')
    }
  }

  const handleCreateEmpleado = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase.from('empleados').insert([
        {
          nombre: formData.nombre,
          puesto: formData.puesto || puestoOptions[0],
          dni: formData.dni,
          contrato: formData.contrato || 'Indefinido',
          sueldo: formData.sueldo || 0,
          iban: formData.iban || '',
          turno: formData.turno || 'Manana',
          vacaciones_tomadas: formData.vacaciones_tomadas || 0,
          vacaciones_restantes: formData.vacaciones_restantes || 30,
          locale: selectedLocal,
        },
      ]).select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      alert('Empleado creado correctamente')
      await fetchEmpleados()

      // Reset form
      setFormData({
        nombre: '',
        puesto: puestoOptions[0],
        dni: '',
        contrato: 'Indefinido',
        sueldo: 0,
        iban: '',
        turno: 'Manana',
        vacaciones_tomadas: 0,
        vacaciones_restantes: 30,
        locale: selectedLocal,
      })
    } catch (error: any) {
      console.error('Error creating empleado:', error)
      alert(`Error al crear empleado: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleDeleteEmpleado = async (id: string) => {
    if (!confirm('Estas seguro de eliminar este empleado?')) return

    try {
      const { error } = await supabase.from('empleados').delete().eq('id', id)
      if (error) throw error
      await fetchEmpleados()
    } catch (error) {
      console.error('Error deleting empleado:', error)
      alert('Error al eliminar empleado')
    }
  }

  const fetchHorariosLocal = async () => {
    if (!selectedLocal) return
    try {
      const { data } = await supabase.from('local_horarios').select('*').eq('locale', selectedLocal).single()
      if (data) {
        setHorariosLocal(data as LocalHorario)
      } else {
        // Valores por defecto si no existe registro
        setHorariosLocal((prev) => ({ ...prev, locale: selectedLocal }))
      }
    } catch (err) {
      console.warn('No se pudieron cargar horarios de local', err)
      setHorariosLocal((prev) => ({ ...prev, locale: selectedLocal }))
    }
  }

  const handleSaveHorariosLocal = async () => {
    try {
      const payload = { ...horariosLocal, locale: selectedLocal }
      const { error } = await supabase.from('local_horarios').upsert(payload)
      if (error) throw error
      alert('Horarios guardados para el local')
    } catch (err: any) {
      console.error('Error guardando horarios por local', err)
      alert('No se pudieron guardar los horarios')
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

  const handleSortNombre = () => {
    if (sortBy === 'nombre-asc') {
      setSortBy('nombre-desc')
    } else {
      setSortBy('nombre-asc')
    }
  }

  const handleSortSueldo = () => {
    if (sortBy === 'sueldo-desc') {
      setSortBy('sueldo-asc')
    } else {
      setSortBy('sueldo-desc')
    }
  }

  const handleSortPuesto = () => {
    if (sortBy === 'puesto-asc') {
      setSortBy('puesto-desc')
    } else {
      setSortBy('puesto-asc')
    }
  }

  // Filtrar y ordenar empleados
  const filteredAndSortedEmpleados = () => {
    let result = [...empleados]

    // Aplicar filtro de búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (emp) =>
          emp.nombre.toLowerCase().includes(query) ||
          (emp.puesto && emp.puesto.toLowerCase().includes(query)) ||
          emp.dni.toLowerCase().includes(query)
      )
    }

    // Aplicar filtro por puesto
    if (filterPuesto) {
      result = result.filter((emp) => emp.puesto === filterPuesto)
    }

    // Aplicar ordenación
    if (sortBy === 'nombre-asc') {
      result.sort((a, b) => a.nombre.localeCompare(b.nombre))
    } else if (sortBy === 'nombre-desc') {
      result.sort((a, b) => b.nombre.localeCompare(a.nombre))
    } else if (sortBy === 'sueldo-asc') {
      result.sort((a, b) => (a.sueldo || 0) - (b.sueldo || 0))
    } else if (sortBy === 'sueldo-desc') {
      result.sort((a, b) => (b.sueldo || 0) - (a.sueldo || 0))
    } else if (sortBy === 'puesto-asc') {
      result.sort((a, b) => {
        const puestoA = a.puesto || ''
        const puestoB = b.puesto || ''
        return puestoA.localeCompare(puestoB)
      })
    } else if (sortBy === 'puesto-desc') {
      result.sort((a, b) => {
        const puestoA = a.puesto || ''
        const puestoB = b.puesto || ''
        return puestoB.localeCompare(puestoA)
      })
    }

    return result
  }

  return (
    <MainLayout
      title="Gestión de Personal"
      subtitle="Control centralizado del equipo de trabajo"
      icon="badge"
      localName={selectedLocal || 'Brutal Soul'}
      onLocalChange={handleLocalChange}
    >
      {/* Sección de Filtros y Métricas */}
      <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Local
            </label>
            <div className="relative group">
              <select
                value={selectedLocal}
                onChange={(e) => handleLocalChange(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl py-3 px-4 pr-10 focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm transition-all hover:border-primary/50"
              >
                <option>Brutal Soul</option>
                <option>Stella Brutal</option>
              </select>
              <span className="material-symbols-rounded absolute right-3 top-3.5 text-slate-400 pointer-events-none group-hover:text-primary transition-colors">
                expand_more
              </span>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Empleados Activos
                </p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                  {empleados.length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-primary flex items-center justify-center">
                <span className="material-symbols-rounded">group</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Extras
                </p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                  {extras.length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <span className="material-symbols-rounded">group_add</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Total Sueldos
                </p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                  {empleados.reduce((sum, emp) => sum + (emp.sueldo || 0), 0).toLocaleString('es-ES')}€
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                <span className="material-symbols-rounded">euro</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabla de Empleados */}
      <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Empleados
              <span className="text-xs font-normal bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                Total: {empleados.length}
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <span className="material-symbols-rounded absolute left-3 top-2.5 text-slate-400">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                placeholder="Buscar empleados..."
                type="text"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
              >
                <span className="material-symbols-rounded text-lg">filter_list</span>
                Filtrar
                {filterPuesto && (
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                )}
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 block">
                        Filtrar por Puesto
                      </label>
                      <select
                        value={filterPuesto}
                        onChange={(e) => setFilterPuesto(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Todos los puestos</option>
                        {puestoOptions.map((puesto) => (
                          <option key={puesto} value={puesto}>
                            {puesto}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setFilterPuesto('')
                        }}
                        className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        Limpiar
                      </button>
                      <button
                        onClick={() => setShowFilterMenu(false)}
                        className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={fetchEmpleados}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-primary transition-colors shadow-sm"
            >
              <span className="material-symbols-rounded">refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                  <button
                    onClick={handleSortNombre}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Nombre
                    <span className="material-symbols-rounded text-lg">
                      {sortBy === 'nombre-asc' ? 'arrow_upward' : sortBy === 'nombre-desc' ? 'arrow_downward' : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                  <button
                    onClick={handleSortPuesto}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Puesto
                    <span className="material-symbols-rounded text-lg">
                      {sortBy === 'puesto-asc' ? 'arrow_upward' : sortBy === 'puesto-desc' ? 'arrow_downward' : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">DNI</th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                  Contrato
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                  <button
                    onClick={handleSortSueldo}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Sueldo
                    <span className="material-symbols-rounded text-lg">
                      {sortBy === 'sueldo-desc' ? 'arrow_downward' : sortBy === 'sueldo-asc' ? 'arrow_upward' : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                  Turno
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 text-center">
                  Vac. Tomadas
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 text-center">
                  Vac. Restantes
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                    Cargando empleados...
                  </td>
                </tr>
              ) : filteredAndSortedEmpleados().length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                    {empleados.length === 0
                      ? 'No hay empleados registrados'
                      : 'No se encontraron empleados con los filtros aplicados'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedEmpleados().map((empleado) => (
                  <tr
                    key={empleado.id}
                    className="group hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                      <Link
                        href={`/empleado/${empleado.id}`}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold overflow-hidden">
                          {empleado.foto_url ? (
                            <img
                              src={empleado.foto_url}
                              alt={empleado.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(empleado.nombre)
                          )}
                        </div>
                        {empleado.nombre}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {empleado.puesto || 'Sin puesto'}
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {empleado.dni}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {empleado.contrato}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      {empleado.sueldo}€
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {empleado.turno || '-'}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {empleado.vacaciones_tomadas || 0}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-green-600 dark:text-green-400">
                      {empleado.vacaciones_restantes || 0}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/empleado/${empleado.id}`}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-rounded text-lg">edit</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteEmpleado(empleado.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-rounded text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Formulario de Creación */}
      <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-8 mb-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Crear Nuevo Empleado
          </h2>
        </div>

        <form onSubmit={handleCreateEmpleado} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Nombre *
            </label>
            <input
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="Ej: Juan Pérez"
              type="text"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Puesto
            </label>
            <select
              value={formData.puesto}
              onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
            >
              {puestoOptions.map((puesto) => (
                <option key={puesto} value={puesto}>
                  {puesto}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              DNI *
            </label>
            <input
              required
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="12345678X"
              type="text"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Sueldo (€)
            </label>
            <input
              value={formData.sueldo}
              onChange={(e) => setFormData({ ...formData, sueldo: Number(e.target.value) })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="0.00"
              type="number"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              IBAN
            </label>
            <input
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="ES98..."
              type="text"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Turno
            </label>
            <select
              value={formData.turno}
              onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
            >
              <option value="Manana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-4 mt-4">
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-medium shadow-md transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-sm">add</span>
              Crear Empleado
            </button>
            <button
              type="button"
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl font-medium border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      {/* Configuración de horarios por local */}
      <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Horarios por Local
          </h2>
          <button
            onClick={handleSaveHorariosLocal}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-medium shadow-md transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-sm">save</span>
            Guardar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Mañana Inicio
            </label>
            <input
              value={horariosLocal.manana_inicio}
              onChange={(e) => setHorariosLocal({ ...horariosLocal, manana_inicio: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
              type="time"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Mañana Fin
            </label>
            <input
              value={horariosLocal.manana_fin}
              onChange={(e) => setHorariosLocal({ ...horariosLocal, manana_fin: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
              type="time"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Tarde Inicio
            </label>
            <input
              value={horariosLocal.tarde_inicio}
              onChange={(e) => setHorariosLocal({ ...horariosLocal, tarde_inicio: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
              type="time"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Tarde Fin
            </label>
            <input
              value={horariosLocal.tarde_fin}
              onChange={(e) => setHorariosLocal({ ...horariosLocal, tarde_fin: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
              type="time"
            />
          </div>
        </div>
      </section>

      {/* Tabla de Extras */}
      {extras.length > 0 && (
        <section className="glass-panel bg-surface-light dark:bg-surface-dark rounded-3xl shadow-glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-2xl text-rose-600">group_add</span>
              Extras
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{extras.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nombre</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Puesto</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Teléfono</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Turno</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Horario</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {extras.map((extra) => {
                  const isEditing = editingExtraId === extra.id
                  return (
                    <tr key={extra.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            value={extraForm.nombre || ''}
                            onChange={(e) => setExtraForm({ ...extraForm, nombre: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
                              {extra.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-white">{extra.nombre}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {isEditing ? (
                          <select
                            value={extraForm.puesto}
                            onChange={(e) => setExtraForm({ ...extraForm, puesto: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            {puestoOptions.map((puesto) => (
                              <option key={puesto} value={puesto}>
                                {puesto}
                              </option>
                            ))}
                          </select>
                        ) : (
                          extra.puesto
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {isEditing ? (
                          <input
                            value={extraForm.telefono || ''}
                            onChange={(e) => setExtraForm({ ...extraForm, telefono: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Teléfono"
                          />
                        ) : (
                          extra.telefono || '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={extraForm.turno}
                            onChange={(e) => setExtraForm({ ...extraForm, turno: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="Manana">Mañana</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Extra">Extra</option>
                          </select>
                        ) : (
                          <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                            extra.turno === 'Manana' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          }`}>
                            {extra.turno}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-slate-600 dark:text-slate-400">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={extraForm.hora_inicio || '09:00'}
                              onChange={(e) => setExtraForm({ ...extraForm, hora_inicio: e.target.value })}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            <span className="text-xs text-slate-400">-</span>
                            <input
                              type="time"
                              value={extraForm.hora_fin || '15:00'}
                              onChange={(e) => setExtraForm({ ...extraForm, hora_fin: e.target.value })}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>
                        ) : (
                          <>
                            {extra.hora_inicio || '09:00'} - {extra.hora_fin || '15:00'}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleUpdateExtra}
                              className="p-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                            >
                              <span className="material-symbols-rounded text-lg">save</span>
                            </button>
                            <button
                              onClick={() => {
                                resetExtraForm()
                                setEditingExtraId(null)
                              }}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                            >
                              <span className="material-symbols-rounded text-lg">close</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => startEditExtra(extra)}
                              className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                            >
                              <span className="material-symbols-rounded text-lg">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteExtra(extra.id, extra.nombre)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                            >
                              <span className="material-symbols-rounded text-lg">delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </MainLayout>
  )
}
