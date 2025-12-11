import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wyonkjnzwxyrpqhsonys.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b25ram56d3h5cnBxaHNvbnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDA2NTcsImV4cCI6MjA4MDg3NjY1N30.m5a13Ow7ekcd9qY_oqFroUCCyV1joovjZ9yV-pSjIqE'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos para las tablas
export interface Empleado {
  id: string
  nombre: string
  dni: string
  contrato: string
  puesto?: string
  sueldo: number
  vacaciones_tomadas?: number
  vacaciones_restantes?: number
  vacaciones_pendientes?: string
  vacaciones_dias?: string
  documentos?: string
  iban?: string
  manipulador?: string
  turno?: string
  locale: string
  notas?: string
  created_at?: string
}

export interface Turno {
  id: string
  fecha: string
  semana: string
  empleado: string
  turno: string
  horas?: string
  locale: string
  created_at?: string
}

export interface Extra {
  id: string
  nombre: string
  puesto: string
  telefono?: string
  turno: string
  locale: string
  hora_inicio?: string
  hora_fin?: string
  created_at?: string
}

export interface LocalHorario {
  id?: string
  locale: string
  manana_inicio: string
  manana_fin: string
  tarde_inicio: string
  tarde_fin: string
  extra_inicio?: string
  extra_fin?: string
  created_at?: string
}

export interface Nomina {
  id: string
  empleado_id: string
  empleado_nombre: string
  periodo_inicio: string
  periodo_fin: string
  importe?: number
  importe_ingresado?: number
  importe_efectivo?: number
  estado: 'Pendiente' | 'Subida' | 'Enviada'
  file_url?: string
  created_at?: string
}
