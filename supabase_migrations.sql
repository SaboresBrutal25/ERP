-- ============================================
-- MIGRACIONES PARA ERP HOSTELERÍA
-- ============================================
-- Ejecuta este archivo completo en el SQL Editor de Supabase
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================
-- 1. CREAR TABLA local_horarios
-- ============================================
CREATE TABLE IF NOT EXISTS local_horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL UNIQUE,
  manana_inicio text NOT NULL DEFAULT '09:00',
  manana_fin text NOT NULL DEFAULT '15:00',
  tarde_inicio text NOT NULL DEFAULT '16:00',
  tarde_fin text NOT NULL DEFAULT '22:00',
  extra_inicio text DEFAULT '20:00',
  extra_fin text DEFAULT '02:00',
  created_at timestamp with time zone DEFAULT now()
);

-- Insertar valores iniciales para los locales
INSERT INTO local_horarios (locale, manana_inicio, manana_fin, tarde_inicio, tarde_fin, extra_inicio, extra_fin)
VALUES
  ('Brutal Soul', '09:00', '15:00', '16:00', '22:00', '20:00', '02:00'),
  ('Stella Brutal', '09:00', '15:00', '16:00', '22:00', '20:00', '02:00')
ON CONFLICT (locale) DO NOTHING;

-- Habilitar RLS (Row Level Security)
ALTER TABLE local_horarios ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON local_horarios;
CREATE POLICY "Enable all operations for authenticated users" ON local_horarios
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. AGREGAR CAMPO horas A TABLA turnos
-- ============================================
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS horas text;

-- ============================================
-- 3. CREAR TABLA extras
-- ============================================
CREATE TABLE IF NOT EXISTS extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  puesto text NOT NULL,
  turno text NOT NULL,
  telefono text,
  locale text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;

-- Crear política
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON extras;
CREATE POLICY "Enable all operations for authenticated users" ON extras
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_extras_locale ON extras(locale);

-- ============================================
-- 4. CREAR TABLA nominas
-- ============================================
CREATE TABLE IF NOT EXISTS nominas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  empleado_nombre text NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fin date NOT NULL,
  importe numeric,
  estado text NOT NULL DEFAULT 'Pendiente',
  file_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;

-- Crear política
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON nominas;
CREATE POLICY "Enable all operations for authenticated users" ON nominas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_nominas_empleado ON nominas(empleado_id);
CREATE INDEX IF NOT EXISTS idx_nominas_periodo ON nominas(periodo_inicio, periodo_fin);

-- ============================================
-- 5. MIGRAR DATOS EXISTENTES (OPCIONAL)
-- ============================================
-- Solo ejecuta esto si tienes turnos con "Refuerzo", "Noche" o "Partido"
-- Esto los convertirá a "Extra"
UPDATE turnos
SET turno = 'Extra'
WHERE turno IN ('Refuerzo', 'Noche', 'Partido');

-- ============================================
-- FIN DE LAS MIGRACIONES
-- ============================================
-- Verifica que todo se haya creado correctamente:

SELECT 'local_horarios' as tabla, COUNT(*) as registros FROM local_horarios
UNION ALL
SELECT 'extras', COUNT(*) FROM extras
UNION ALL
SELECT 'nominas', COUNT(*) FROM nominas;
