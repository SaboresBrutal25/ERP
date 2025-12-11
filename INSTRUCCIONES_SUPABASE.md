# Instrucciones para configurar Supabase Storage

## Crear Buckets de Storage

Ve a tu proyecto de Supabase → Storage → Create bucket

### 1. Bucket para Nóminas
- **Nombre**: `nominas`
- **Public**: ✅ Activado (para poder acceder a los PDFs)
- **Allowed MIME types**: application/pdf
- **File size limit**: 10 MB

### 2. Bucket para Documentos de Empleados
- **Nombre**: `empleados-docs`
- **Public**: ✅ Activado
- **Allowed MIME types**: application/pdf, image/jpeg, image/png
- **File size limit**: 10 MB

### 3. Configurar Políticas RLS (Row Level Security)

Para cada bucket, ve a Policies y crea:

```sql
-- Para bucket 'nominas'
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'nominas');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'nominas' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'nominas');

-- Repetir lo mismo para 'empleados-docs'
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'empleados-docs');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'empleados-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'empleados-docs');
```

## Ejecutar SQL pendiente

También ejecuta los archivos SQL en este orden:

1. `supabase_migrations.sql` - Crea tablas local_horarios y nominas
2. `supabase_extras_update.sql` - Agrega campos hora_inicio y hora_fin a extras
