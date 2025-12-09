# ERP Hostelería

Aplicación full-stack tipo ERP para hostelería con módulos de empleados, turnos, contabilidad, ventas, stock y facturación. Frontend en React + Tailwind, backend en Node.js + Express con persistencia local en ficheros JSON (sin Google Sheets).

## Requisitos
- Node.js >= 18

## Configuración
1) Copia `.env.example` a `.env` en la raíz y ajusta si lo necesitas:
   - `DATA_DIR`: carpeta donde se guardan los JSON (por defecto `./server/data`).
   - `CLIENT_ORIGIN`: orígenes permitidos para CORS.
   - Usuarios demo (`ADMIN_*` y `ENCARGADO_*`) y `JWT_SECRET`.
2) `VITE_API_URL` debe apuntar al backend (`http://localhost:4000/api`).

## Instalación
```bash
npm install          # instala dependencias de raíz
npm run install:all  # instala client y server
```

## Desarrollo
```bash
npm run dev          # levanta servidor Express (4000) y Vite (5173)
```
- Backend: `npm --prefix server run dev`
- Frontend: `npm --prefix client run dev`

## Persistencia local
- Los datos se guardan en `server/data/*.json` (uno por módulo).
- Puedes borrar o editar los ficheros para resetear datos. Si no existen, se crean solos.

## Auth básica
- Login `POST /api/auth/login` con email/password del entorno.
- Roles:
  - `manager`: acceso completo.
  - `encargado`: solo puede ver/modificar registros de su `local`.

## Endpoints principales (REST)
`/api/{empleados|turnos|contabilidad|ventas|stock|facturacion}` soportan GET, POST, PUT/:id, DELETE/:id. Ejemplo:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/empleados
```

## Notas
- IDs generados en backend con `nanoid`.
- Al eliminar, el registro desaparece del JSON.
- Se incluyen datos de ejemplo en `server/data` para probar la UI al instante.
