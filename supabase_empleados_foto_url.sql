-- Añadir columna foto_url a la tabla empleados
ALTER TABLE empleados
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Asegurarse de que el bucket empleados-fotos sea PÚBLICO
-- IMPORTANTE: Ejecuta esto en el SQL Editor de Supabase
UPDATE storage.buckets
SET public = true
WHERE id = 'empleados-fotos';

-- Si el bucket no existe, créalo primero desde la interfaz de Storage
-- o ejecuta este comando (solo si no existe):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('empleados-fotos', 'empleados-fotos', true)
-- ON CONFLICT (id) DO UPDATE SET public = true;

-- IMPORTANTE: Primero elimina las políticas existentes si las hay
DROP POLICY IF EXISTS "Public read access for empleados-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload empleados-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update empleados-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete empleados-fotos" ON storage.objects;

-- Política de lectura pública para empleados-fotos
CREATE POLICY "Public read access for empleados-fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'empleados-fotos');

-- Política de escritura para TODOS (anónimos y autenticados)
CREATE POLICY "Anyone can upload empleados-fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'empleados-fotos');

-- Política de actualización para TODOS
CREATE POLICY "Anyone can update empleados-fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'empleados-fotos');

-- Política de eliminación para TODOS
CREATE POLICY "Anyone can delete empleados-fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'empleados-fotos');
