# ERP Hostelería - Sistema de Gestión Integral

Aplicación web ERP desarrollada con Next.js, TailwindCSS y Supabase para la gestión integral de empresas de hostelería.

## Características

### Módulos Implementados

1. **Gestión de Personal**
   - Listado completo de empleados con búsqueda y filtros
   - Creación y edición de empleados
   - Vista de métricas (empleados activos, módulos, etc.)
   - Integración completa con Supabase

2. **Ficha Detallada de Empleado**
   - Información laboral completa (contrato, sueldo, IBAN, turno)
   - Datos personales (DNI, local asignado)
   - Gestión de vacaciones con calendario visual
   - Sistema de documentación (subida de archivos)
   - Notas internas editables

3. **Gestión de Horarios**
   - Cuadrante semanal visual
   - Asignación de turnos por empleado y día
   - Vista de plantillas de turno (Mañana, Tarde, Noche, Partido)
   - Navegación semanal
   - Filtrado por local

4. **Gestión de Nóminas**
   - Sistema de subida de archivos PDF
   - Listado de nóminas por empleado
   - Estados (Pendiente, Subida, Enviada)
   - Actividad reciente con progreso de subida
   - Exportación y envío masivo

### Características Técnicas

- **Next.js 14** con App Router
- **TailwindCSS** para estilos (diseño pixel-perfect)
- **Supabase** como backend (base de datos real)
- **Modo oscuro** completamente funcional
- **Diseño responsive** adaptado a móviles y desktop
- **Material Symbols Rounded** para iconografía
- **TypeScript** para tipado estático

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Las credenciales de Supabase ya están configuradas en `.env.local`

4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Abrir en el navegador: http://localhost:3001

## Estructura del Proyecto

```
├── app/                      # Páginas de Next.js (App Router)
│   ├── page.tsx             # Gestión de Personal
│   ├── empleado/[id]/       # Ficha detallada
│   ├── horarios/            # Gestión de horarios
│   ├── nominas/             # Gestión de nóminas
│   └── globals.css          # Estilos globales
├── components/              # Componentes reutilizables
│   ├── Sidebar.tsx          # Menú lateral
│   ├── Header.tsx           # Cabecera con modo oscuro
│   └── MainLayout.tsx       # Layout principal
├── lib/
│   └── supabase.ts          # Cliente de Supabase
└── public/                  # Archivos estáticos
```

## Base de Datos (Supabase)

### Tablas Utilizadas

1. **empleados**
   - Información completa del empleado
   - Campos: nombre, dni, contrato, sueldo, vacaciones, documentos, turno, locale, etc.

2. **turnos**
   - Asignación de turnos semanales
   - Campos: fecha, semana, empleado, turno, locale

3. **contabilidad** (preparada para uso futuro)
4. **facturacion** (preparada para uso futuro)
5. **stock** (preparada para uso futuro)
6. **ventas** (preparada para uso futuro)

## Funcionalidades CRUD

### Empleados
- ✅ Crear empleado
- ✅ Leer/Listar empleados
- ✅ Actualizar empleado
- ✅ Eliminar empleado

### Turnos
- ✅ Crear turno
- ✅ Leer turnos por semana
- ⚠️ Actualizar turno (pendiente)
- ⚠️ Eliminar turno (pendiente)

## Modo Oscuro

El modo oscuro está completamente implementado y se guarda en localStorage. Usa el toggle en la cabecera para cambiar entre modos.

## Navegación

- **Gestión de Personal**: `/` (página principal)
- **Ficha de Empleado**: `/empleado/[id]`
- **Horarios**: `/horarios`
- **Nóminas**: `/nominas`

## Credenciales de Supabase

Las credenciales están configuradas en `.env.local`:
- URL: https://wyonkjnzwxyrpqhsonys.supabase.co
- Anon Key: Configurada en el archivo

## Comandos Disponibles

```bash
npm run dev      # Iniciar servidor de desarrollo
npm run build    # Construir para producción
npm run start    # Iniciar servidor de producción
npm run lint     # Ejecutar linter
```

## Diseño

El diseño está basado fielmente en los archivos HTML proporcionados en la carpeta `diseño_stitch/`, utilizando:
- Fuente: Plus Jakarta Sans
- Iconos: Material Symbols Rounded
- Efectos: Glass morphism, sombras suaves
- Colores: Sistema de colores primario azul (#2563EB)

## Próximas Mejoras Sugeridas

1. Sistema de autenticación con Supabase Auth
2. Gestión de permisos por roles (Admin, Manager, Empleado)
3. Módulo de contabilidad
4. Módulo de facturación
5. Gestión de stock
6. Dashboard con gráficos y métricas
7. Notificaciones en tiempo real
8. Exportación de informes PDF/Excel
9. Sistema de chat interno
10. Aplicación móvil con React Native

## Soporte

Para cualquier duda o problema, revisar la documentación de:
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [TailwindCSS](https://tailwindcss.com/docs)

---

**Desarrollado con ❤️ usando Next.js, TailwindCSS y Supabase**
