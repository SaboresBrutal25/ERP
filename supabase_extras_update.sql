-- ============================================
-- ACTUALIZACIÓN TABLA EXTRAS - Agregar campos de hora
-- ============================================
-- Ejecuta esto en el SQL Editor de Supabase

ALTER TABLE extras ADD COLUMN IF NOT EXISTS hora_inicio text DEFAULT '09:00';
ALTER TABLE extras ADD COLUMN IF NOT EXISTS hora_fin text DEFAULT '15:00';

-- Verificar que se agregaron correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'extras';
