-- Agregar columna de puesto a la tabla empleados (Supabase)
-- Ejecuta este script en el editor SQL de tu proyecto.

ALTER TABLE empleados
ADD COLUMN IF NOT EXISTS puesto text;

-- Opcional: rellena valores iniciales si necesitas un valor por defecto
-- UPDATE empleados SET puesto = 'Camarero' WHERE puesto IS NULL;
