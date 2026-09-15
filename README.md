# Proyecto Dental — Frontend

Interfaz web para administrar un consultorio dental ("Odontología Familiar"): agenda semanal de citas, expedientes de pacientes con su historial de tratamientos, dashboard de métricas anuales y gestión de usuarios. Consume el API del repositorio `backend` (Elysia + Bun) y en producción ese mismo servidor la sirve.

## Stack

| Pieza            | Tecnología                                                               |
| ---------------- | ------------------------------------------------------------------------ |
| UI               | React 19 + TypeScript 6                                                  |
| Build            | Vite 8 (Rolldown) con **React Compiler** (`babel-plugin-react-compiler`) |
| Enrutamiento     | React Router 8 en modo *Data* (`createHashRouter`, loaders)              |
| Estado servidor  | TanStack Query 5                                                         |
| Estado cliente   | Zustand 5 (sesión persistida en `localStorage`)                          |
| HTTP             | Axios                                                                    |
| Estilos          | Tailwind CSS 4 (`@tailwindcss/vite`, sin `tailwind.config.js`)           |
| Componentes      | shadcn/ui, estilo `base-vega` sobre **Base UI** (`@base-ui/react`), íconos `lucide-react` |
| Formularios      | React Hook Form                                                          |
| Gráficas         | Recharts                                                                 |
| Notificaciones   | Sonner (toasts) + `AlertDialog` de shadcn para confirmaciones            |
| Gestor de paquetes | Bun (`bun.lock`)                                                       |

## Requisitos

- Bun ≥ 1.3
- El backend corriendo (por defecto en `http://localhost:3000`) para desarrollo

## Configuración

| Archivo           | `VITE_API_URL`          | Cuándo se usa                                                        |
| ----------------- | ----------------------- | -------------------------------------------------------------------- |
| `.env`            | `http://localhost:3000` | `bun run dev`: el API corre aparte, en otro origen.                  |
| `.env.production` | *(vacío)*               | `vite build`: peticiones relativas al mismo origen que sirve la app. |
| `.env.local`      | —                       | Sobrescrituras locales, no se versiona (`*.local`).                  |

`src/api/client.ts` usa `import.meta.env.VITE_API_URL ?? "http://localhost:3000"` como `baseURL` de Axios. Un valor vacío es válido y significa "mismo origen".

## Scripts

```bash
bun install
bun run dev            # servidor de desarrollo con HMR
bun run lint           # ESLint
bun run build          # tsc -b + vite build → dist/
bun run build:server   # tsc -b + vite build → ../backend/public (producción)
bun run preview        # sirve el último build de dist/
```

`tsc -b` es el **único** chequeo de tipos (no hay script `typecheck`) y la configuración de ESLint no usa información de tipos. Antes de integrar cambios, corre `lint` y después `build`.

Las pruebas usan el runner integrado de Bun (`bun:test`), en archivos `src/**/*.test.ts`:

```bash
bun test                                     # todas
bun test src/lib/patient-birthdate.test.ts   # un archivo
bun test -t "calculateAge"                   # por nombre
```

Los `*.test.ts` están excluidos de `tsconfig.app.json`, así que `tsc -b` no los revisa.

## Despliegue

La aplicación no se despliega por separado: el backend sirve el build desde su carpeta `public/`.

```bash
bun run build:server           # compila dentro de ../backend/public (la vacía antes)
cd ../backend && bun run start # reiniciar si ya estaba corriendo
```

Se usa **`createHashRouter`** (`/#/agenda`, `/#/pacientes/12`): el servidor solo tiene que responder `/` con `index.html`, sin reglas de *fallback*, y las rutas del cliente nunca chocan con las del API (`/pacientes`, `/citas`, …). Los detalles del lado del servidor están en el README del backend.

## Estructura

```
src/
├── main.tsx              # createRoot + StrictMode
├── ClinicApp.tsx         # Providers: QueryClientProvider + RouterProvider (+ Devtools en dev)
├── routes.tsx            # Árbol de rutas y loaders (importable sin DOM)
├── router.tsx            # createHashRouter(routes)
├── api/                  # Capa HTTP
│   ├── client.ts         # Instancia de Axios, header `token`, normalización a ApiError
│   ├── endpoints.ts      # Mapa de rutas del backend
│   └── types.ts          # DTOs tal como los envía el servidor
├── actions/              # Una función async por endpoint; traduce DTO <-> modelo de UI
├── hooks/                # TanStack Query sobre las actions (useAuth, usePatients, useAgenda, …)
├── store/                # Zustand: auth.store (sesión) y ui.store (filtros, borrador de cita)
├── lib/
│   ├── mappers.ts        # DTO <-> dominio (fechas, importes)
│   ├── clinic-data.ts    # Formato es-MX, semanas ISO, días de atención
│   ├── query-client.ts   # Configuración de TanStack Query
│   └── query-keys.ts     # Claves de caché
├── types/clinic.ts       # Tipos de dominio
├── layouts/AppLayout.tsx # Layout autenticado (navegación + <Outlet/>)
├── pages/                # Una vista por ruta
└── components/
    ├── ui/               # Generados por shadcn (no editar a mano)
    └── custom/           # Componentes propios (diálogos, confirm-dialog, calendario, time-picker, tabla de tratamientos)
```

## Arquitectura

### Flujo de datos

```
pages / components  →  hooks (TanStack Query)  →  actions  →  api (Axios)  →  backend
                                  ↑                    │
                        lib/mappers.ts  ←──────────────┘  (DTO → modelo de UI)
```

- Los componentes **solo consumen hooks**; nunca llaman a `api` ni a las `actions` directamente.
- El estado del servidor vive en TanStack Query. Zustand guarda solo lo que es del cliente: la sesión y los filtros de UI.
- `query-client.ts`: `staleTime` de 30 s, sin recarga al enfocar la ventana y **sin reintentos para errores 4xx** (un 401/403/404/409 no se arregla reintentando). Los 5xx se reintentan hasta 2 veces.
- `api/client.ts` inyecta el JWT en el header **`token`** (así lo espera el backend, no `Authorization`) y convierte cualquier error en `ApiError { message, status }`.

### Rutas

| Ruta                | Vista                            | Protección                        |
| ------------------- | -------------------------------- | --------------------------------- |
| `/login`            | `LoginView`                      | Redirige a `/agenda` si hay sesión |
| `/`                 | → `/agenda`                      | `requireAuth`                     |
| `/agenda`           | `AgendaView`                     | `requireAuth`                     |
| `/dashboard`        | `DashboardView`                  | `requireAuth` + `requireMedico`   |
| `/pacientes`        | `PatientsView` (lista + `<Outlet/>`) | `requireAuth`                 |
| `/pacientes/:id`    | `PatientDetailView`              | `requireAuth`                     |
| `/pacientes/nuevo`  | `PatientFormView` (página completa) | `requireAuth`                  |
| `/usuarios`         | `UsersView`                      | `requireAuth` + `requireMedico`   |
| `*`                 | `NotFoundView`                   | —                                 |

La protección está en **loaders**, no en componentes. La sesión de Zustand se hidrata de `localStorage` de forma sincrónica, así que `requireAuth` la lee antes de que React monte. Si no hay sesión, redirige a `/login?redirectTo=<ruta original>`.

### Autenticación y roles

- `auth.store.ts` persiste `{ token, usuario }` bajo la clave `dentalcare.auth` de `localStorage`.
- Dos roles: **`medico`** (administrador, ve `/usuarios` y `/dashboard`) y **`asistente`** (trabaja sobre la agenda y los pacientes de un médico que elige).
- El dashboard es solo del médico: sus métricas (ventas, dinero por cobrar) no deben verlas los asistentes. Se oculta del menú (`medicoOnly` en `AppLayout`) y la ruta redirige a `/agenda` con `requireMedico`. El backend responde `GET /user/dashboard` a cualquier usuario autenticado, pero filtra por el correo del token, así que un asistente nunca recibe los datos del médico.
- El token dura 1 día. Ante un 401 fuera de `/auth`, el interceptor de Axios limpia la sesión y `AppLayout` redirige a `/login`.

### Reglas de dominio

- **Días de atención**: `CLOSED_WEEKDAYS` en `lib/clinic-data.ts` es el único lugar donde se define qué días cierra el consultorio (hoy, domingo). De ahí salen las columnas de la agenda, los días deshabilitados del calendario, la validación del formulario de cita y los textos de la interfaz.
- **Agenda semanal**: se pide por año-semana **ISO** (lunes a domingo) y se reagrupa por día **local**. Las citas que caen fuera de la semana por desfase de huso horario se listan aparte (`outOfWeek`) para no perderlas. Usa `getISOWeek`/`isoWeekDates`, no aritmética manual: a inicios de enero, el año ISO puede no coincidir con el calendario.
- **Fechas**: `parseISO` interpreta fechas ISO como **locales** para evitar corrimientos de un día. Úsala en lugar de `new Date(iso)` para campos de fecha.
- **Importes**: el backend envía `numeric` como string (`"1200.00"`) pero valida `number` al recibir. `toNumber` en `mappers.ts` normaliza en ambos sentidos.
- **Tratamientos**: `PUT /pacientes/:id` reemplaza la lista completa, así que la tabla de tratamientos se edita en bloque y se guarda con una sola petición.
- **Alta de paciente desde una cita**: el diálogo de nueva cita se controla por URL (`/agenda?cita=nueva`) y su borrador vive en `ui.store`. Al pasar por `/pacientes/nuevo?redirectTo=…` no se pierde lo capturado, y el paciente creado vuelve preseleccionado (`&paciente=<id>`).
- **Dashboard**: una sola petición a `GET /user/dashboard?year=`, que ya viene agregada.

La interfaz y los formatos están en **español (es-MX)**. Usa los helpers de `clinic-data.ts` (`formatCurrency`, `formatLongDate`, …) para textos nuevos.

## Convenciones de código

- Alias `@/*` → `src/*` (configurado en `tsconfig.json` y en `vite.config.ts`).
- `verbatimModuleSyntax` está activo: los imports de solo tipos van con `import { type Foo }`.
- **React Compiler** memoiza automáticamente; evita `useMemo`/`useCallback` manuales. No quites el plugin de Babel de `vite.config.ts`, el preset del compilador depende de él.
- `src/components/ui/` es código generado (`bunx shadcn add <componente>`). Para personalizarlo, copia el componente a `src/components/custom/`. ESLint desactiva `react-refresh/only-export-components` solo en esa carpeta porque shadcn exporta las variantes `cva` junto al componente.
- Tailwind 4: los tokens del tema son variables CSS en `src/index.css` (`@theme inline`).
- Capas superpuestas: los diálogos van en `z-50` y el popover del calendario en `z-60` para quedar por encima.
- **Confirmaciones y toasts**: no uses `window.alert`/`window.confirm`. Para acciones destructivas usa `ConfirmDialog` (`components/custom/confirm-dialog.tsx`, sobre el `AlertDialog` de shadcn): recibe el `trigger`, los textos y un `onConfirm` que devuelve una promesa, y muestra el toast solo (éxito, error del servidor o "cancelado" al cerrar con Cancelar/Esc). Mientras corre la acción no se puede cerrar; si falla, sigue abierto para reintentar. Hoy se usa para dar de baja pacientes, eliminar asistentes y eliminar citas.
- Los toasts son de **Sonner**: `<Toaster position="bottom-right" richColors />` se monta una vez en `ClinicApp.tsx`; en cualquier otro lugar basta `import { toast } from "sonner"`.
- Al instalar componentes con `bunx shadcn add`, contesta **no** si pregunta por sobrescribir `button.tsx` (u otro ya existente). El registro de `alert-dialog` generó `import { cn } from "cn"` y agregó un paquete `cn` de npm: el import correcto es `@/lib/utils` y ese paquete no se usa.

## Documentación relacionada

- `ENDPOINTS.md`: referencia completa del API (cuerpos, respuestas y errores).
- `DASHBOARD.md`: contrato y cálculo de `GET /user/dashboard`.
- `AGENTS.md`: guía para asistentes de código.


femenino y masculino