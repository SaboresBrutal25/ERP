# Configuración de Supabase

## Permisos Necesarios

Para que la aplicación funcione correctamente, necesitas configurar los permisos RLS (Row Level Security) en Supabase:

### Opción 1: Desactivar RLS (Desarrollo)

**⚠️ SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN**

En Supabase Dashboard:
1. Ve a `Authentication` > `Policies`
2. Selecciona la tabla `empleados`
3. Desactiva "Enable RLS" temporalmente
4. Haz lo mismo para la tabla `turnos`

### Opción 2: Configurar Políticas RLS (Recomendado)

Ejecuta estos comandos SQL en Supabase SQL Editor:

```sql
-- Permitir lectura pública de empleados
CREATE POLICY "Enable read access for all users" ON "public"."empleados"
FOR SELECT
USING (true);

-- Permitir inserción pública de empleados
CREATE POLICY "Enable insert for all users" ON "public"."empleados"
FOR INSERT
WITH CHECK (true);

-- Permitir actualización pública de empleados
CREATE POLICY "Enable update for all users" ON "public"."empleados"
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Permitir eliminación pública de empleados
CREATE POLICY "Enable delete for all users" ON "public"."empleados"
FOR DELETE
USING (true);

-- Permitir lectura pública de turnos
CREATE POLICY "Enable read access for all users" ON "public"."turnos"
FOR SELECT
USING (true);

-- Permitir inserción pública de turnos
CREATE POLICY "Enable insert for all users" ON "public"."turnos"
FOR INSERT
WITH CHECK (true);

-- Permitir actualización pública de turnos
CREATE POLICY "Enable update for all users" ON "public"."turnos"
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Permitir eliminación pública de turnos
CREATE POLICY "Enable delete for all users" ON "public"."turnos"
FOR DELETE
USING (true);
```

### Verificar Permisos

Para verificar que los permisos están configurados correctamente:

1. Ve a Supabase Dashboard
2. Abre `Table Editor`
3. Selecciona la tabla `empleados`
4. Haz clic en el botón de configuración (⚙️)
5. Verifica que:
   - RLS está habilitado
   - Las políticas están activas
   - Las políticas permiten las operaciones necesarias (SELECT, INSERT, UPDATE, DELETE)

## Solución Rápida al Error 401

Si ves el error:
```
Failed to load resource: the server responded with a status of 401
```

Significa que RLS está bloqueando las operaciones. Opciones:

1. **Rápido (Desarrollo)**: Desactiva RLS en la tabla
2. **Correcto**: Configura las políticas RLS como se indica arriba
3. **Producción**: Implementa autenticación con Supabase Auth y políticas basadas en roles

## Credenciales

Las credenciales están en `.env.local`:
- URL: `https://wyonkjnzwxyrpqhsonys.supabase.co`
- Anon Key: (ver archivo .env.local)

## Notas Importantes

- La aplicación usa la "anon key" de Supabase
- Esta key tiene permisos limitados por defecto
- RLS debe estar configurado para permitir operaciones
- En producción, implementa autenticación adecuada
