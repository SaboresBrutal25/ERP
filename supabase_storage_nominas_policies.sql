-- Crea/ajusta bucket y políticas para subir nóminas desde el frontend (sin sesión de servicio)

-- 1) Crear bucket si no existe
insert into storage.buckets (id, name, public)
values ('nominas', 'nominas', true)
on conflict (id) do update set public = true;

-- 2) Políticas de acceso (ajusta a tu necesidad: anónimos o sólo autenticados)
-- Limpia políticas previas específicas del bucket (opcional)
delete from storage.policies where bucket_id = 'nominas';

-- Permitir leer
create policy "Public read nominas" on storage.objects
for select using (bucket_id = 'nominas');

-- Permitir subir (insert)
create policy "Public upload nominas" on storage.objects
for insert with check (bucket_id = 'nominas');

-- Permitir actualizar
create policy "Public update nominas" on storage.objects
for update using (bucket_id = 'nominas');

-- Permitir borrar
create policy "Public delete nominas" on storage.objects
for delete using (bucket_id = 'nominas');
