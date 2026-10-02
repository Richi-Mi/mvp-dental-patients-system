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
bun run build:server   # test + lint + tsc -b + vite build → ../backend/public (producción)
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
bun run build:server           # corre pruebas y lint, y compila dentro de ../backend/public (la vacía antes)
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
│   ├── client.ts         # Instancia de Axios, header `token`, normalización a ApiError, detecta errores de red
│   ├── endpoints.ts      # Mapa de rutas del backend
│   └── types.ts          # DTOs tal como los envía el servidor
├── actions/              # Una función async por endpoint; traduce DTO <-> modelo de UI
│   └── offline.actions.ts  # Reenvía al backend un cambio guardado sin conexión (ver Modo sin conexión)
├── hooks/                # TanStack Query sobre las actions (useAuth, usePatients, useAgenda, …)
│   ├── useOfflineSync.ts       # Motor de reconexión/reintento + versión sin efectos (useOfflineStatus/useSyncNow)
│   └── useOwnPendingOperations.ts  # Cambios sin sincronizar de la sesión activa
├── store/                # Zustand: auth.store (sesión), ui.store (filtros, borrador de cita) y offline.store (cola sin conexión, en localStorage)
├── lib/
│   ├── mappers.ts        # DTO <-> dominio (fechas, importes)
│   ├── clinic-data.ts    # Formato es-MX, semanas ISO, días de atención
│   ├── query-client.ts   # Configuración de TanStack Query
│   ├── query-keys.ts     # Claves de caché
│   ├── patient-photos.ts # Reglas de las fotos (máximo 5, tamaño, formatos) que se revisan antes de subir
│   ├── offline-queue.ts  # Lógica pura de la cola sin conexión (compactar cambios, combinarlos con datos del servidor)
│   ├── save-or-queue.ts  # Intenta guardar en el servidor; si no hay conexión, encola
│   └── offline-sync.ts   # Reenvía la cola pendiente y refresca las consultas al recuperar conexión
├── types/clinic.ts       # Tipos de dominio
├── layouts/AppLayout.tsx # Layout autenticado (navegación + <Outlet/>; monta el motor de sincronización)
├── pages/                # Una vista por ruta
└── components/
    ├── ui/               # Generados por shadcn (no editar a mano)
    └── custom/           # Componentes propios (diálogos, confirm-dialog, calendario, time-picker, tabla de tratamientos, imágenes del paciente y su visor, sync-button)
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
| `/ajustes`          | `SettingsView`                   | `requireAuth` + `requireMedico`   |
| `*`                 | `NotFoundView`                   | —                                 |

La protección está en **loaders**, no en componentes. La sesión de Zustand se hidrata de `localStorage` de forma sincrónica, así que `requireAuth` la lee antes de que React monte. Si no hay sesión, redirige a `/login?redirectTo=<ruta original>`.

### Autenticación y roles

- `auth.store.ts` persiste `{ token, usuario }` bajo la clave `dentalcare.auth` de `localStorage`.
- Dos roles: **`medico`** (administrador, ve `/usuarios` y `/dashboard`) y **`asistente`** (trabaja sobre la agenda y los pacientes de un médico que elige).
- El dashboard es solo del médico: sus métricas (ventas, dinero por cobrar) no deben verlas los asistentes. Se oculta del menú (`medicoOnly` en `AppLayout`) y la ruta redirige a `/agenda` con `requireMedico`. El backend responde `GET /user/dashboard` a cualquier usuario autenticado, pero filtra por el correo del token, así que un asistente nunca recibe los datos del médico.
- El token dura 3 días. Ante un 401 fuera de `/auth`, el interceptor de Axios limpia la sesión y `AppLayout` redirige a `/login`.

### Reglas de dominio

- **Días de atención**: `CLOSED_WEEKDAYS` en `lib/clinic-data.ts` es el único lugar donde se define qué días cierra el consultorio (hoy, domingo). De ahí salen las columnas de la agenda, los días deshabilitados del calendario, la validación del formulario de cita y los textos de la interfaz.
- **Horario de atención**: `OPENING_HOUR`/`CLOSING_HOUR` en `lib/clinic-data.ts` definen el rango (hoy, de 10 a 20 h). De ahí salen las filas del horario semanal (`AGENDA_HOURS`, un bloque por hora) y el rango que acepta el `TimePicker`. La última hora es un bloque completo: una cita de las 20:45 sigue en horario (por eso la hora de fin admite una hora más, `LAST_END_HOUR`).
- **Duración de las citas**: cada cita tiene hora de inicio y de fin (`time`/`endTime`, `horaFin` en el API, en el reloj del consultorio). Una cita nueva dura una hora; en el formulario, mover la hora de inicio arrastra la de fin conservando la duración, y el fin debe ser posterior al inicio.
- **Agenda semanal**: se pide por año-semana **ISO** (lunes a domingo) y se reagrupa por día **local**. Se muestra como un horario en CSS Grid: las filas son las horas de atención y las columnas los días abiertos. Cada cita abarca las filas de las horas que toca hasta su fin (`layoutDay`); las que empiezan en la misma hora se apilan en un bloque (10:15 y 10:45 caen las dos en el de las 10:00) y las que se enciman con otra van lado a lado, en carriles que ensanchan ese día. Las citas que caen fuera de la semana por desfase de huso horario se listan aparte (`outOfWeek`) y las que caen fuera del horario van a la fila "Fuera" (`groupByHour`), para no perderlas. Usa `getISOWeek`/`isoWeekDates`, no aritmética manual: a inicios de enero, el año ISO puede no coincidir con el calendario.
- **Fechas**: `parseISO` interpreta fechas ISO como **locales** para evitar corrimientos de un día. Úsala en lugar de `new Date(iso)` para campos de fecha.
- **Importes**: el backend envía `numeric` como string (`"1200.00"`) pero valida `number` al recibir. `toNumber` en `mappers.ts` normaliza en ambos sentidos.
- **Tratamientos**: `PUT /pacientes/:id` reemplaza la lista completa, así que la tabla de tratamientos se edita en bloque y se guarda con una sola petición.
- **Alta de paciente desde una cita**: el diálogo de nueva cita se controla por URL (`/agenda?cita=nueva`) y su borrador vive en `ui.store`. Al pasar por `/pacientes/nuevo?redirectTo=…` no se pierde lo capturado, y el paciente creado vuelve preseleccionado (`&paciente=<id>`).
- **Dashboard**: una sola petición a `GET /user/dashboard?year=&month=`, que ya viene agregada. El mes y el año se eligen con segmentadores y viven en la URL.
- **Imágenes del paciente**: sección del expediente, debajo del control de tratamiento. Admite hasta 5 imágenes por paciente, con el contador `n/5`. Se suben varias a la vez (JPG, PNG, WebP, GIF o BMP de hasta 20 MB) y el backend las guarda en WebP. Al hacer clic en una se abre un visor con `<` y `>` (o las flechas del teclado), y cada miniatura tiene un botón para eliminarla que aparece al pasar el puntero. Las imágenes piden el header `token`, así que no van en un `<img src>`: se descargan con Axios y se muestran con un object URL (`PhotoImage`).

La interfaz y los formatos están en **español (es-MX)**. Usa los helpers de `clinic-data.ts` (`formatCurrency`, `formatLongDate`, …) para textos nuevos.

### Modo sin conexión

Si el consultorio se queda sin internet a media consulta, crear o editar citas, pacientes, tratamientos e historial clínico sigue funcionando: los cambios se guardan en el equipo y se envían solos al recuperar la conexión.

- Cuando una mutación falla por falta de red (no por un error real del servidor), `saveOrQueue` (`lib/save-or-queue.ts`) la guarda en una cola persistida en `localStorage` (`store/offline.store.ts`, clave `dentalcare.offline`) y la pantalla actúa de inmediato como si se hubiera guardado. Los hooks de agenda, pacientes e historial clínico combinan esa cola con lo último que trajo el servidor en cada render (`lib/offline-queue.ts`), así que los cambios pendientes se ven al instante sin esperar respuesta.
- Un paciente creado sin conexión recibe un id temporal (negativo) hasta que se sincroniza; su expediente nunca se pide al servidor mientras tanto. Al sincronizar, la URL de su expediente cambia sola al id real.
- Antes de guardar una cita sin conexión se revisa contra lo que ya se conoce de esa agenda si el horario ya está ocupado (el backend no puede validarlo hasta que haya conexión): si choca, se avisa de inmediato en vez de descubrirlo minutos después al sincronizar.
- Al recuperar la conexión (el evento `online` del navegador, o cada 15 s si no se sabe si ya volvió — útil cuando el que se cayó fue el servidor, no la red del equipo) se refrescan las pantallas y se reenvían los cambios pendientes en orden. Un cambio que ya no se puede aplicar (p. ej. el horario se ocupó mientras tanto) se descarta con un aviso explicando el motivo.
- El botón de sincronización, arriba a la derecha en la Agenda, solo aparece mientras hay cambios sin sincronizar.
- Las imágenes de los pacientes son la excepción: subirlas o eliminarlas necesita conexión, porque los archivos no caben en la cola. Tampoco se guardan en el equipo para verlas sin conexión (son imágenes clínicas).
- El token de sesión dura 3 días (antes 1), precisamente para tolerar una jornada sin conexión sin pedir volver a iniciar sesión.

Detalle técnico completo (comportamiento ante race conditions, ids temporales, compactación de la cola) en `CLAUDE.md`.

## Convenciones de código

- Alias `@/*` → `src/*` (configurado en `tsconfig.json` y en `vite.config.ts`).
- `verbatimModuleSyntax` está activo: los imports de solo tipos van con `import { type Foo }`.
- **React Compiler** memoiza automáticamente; evita `useMemo`/`useCallback` manuales. No quites el plugin de Babel de `vite.config.ts`, el preset del compilador depende de él.
- `src/components/ui/` es código generado (`bunx shadcn add <componente>`). Para personalizarlo, copia el componente a `src/components/custom/`. ESLint desactiva `react-refresh/only-export-components` solo en esa carpeta porque shadcn exporta las variantes `cva` junto al componente.
- Tailwind 4: los tokens del tema son variables CSS en `src/index.css` (`@theme inline`).
- Capas superpuestas: los diálogos van en `z-50` y el popover del calendario en `z-60` para quedar por encima.
- **Confirmaciones y toasts**: no uses `window.alert`/`window.confirm`. Para acciones destructivas usa `ConfirmDialog` (`components/custom/confirm-dialog.tsx`, sobre el `AlertDialog` de shadcn): recibe el `trigger`, los textos y un `onConfirm` que devuelve una promesa, y muestra el toast solo (éxito, error del servidor o "cancelado" al cerrar con Cancelar/Esc). Mientras corre la acción no se puede cerrar; si falla, sigue abierto para reintentar. Hoy se usa para dar de baja pacientes, eliminar asistentes, eliminar citas y eliminar imágenes de pacientes.
- Los toasts son de **Sonner**: `<Toaster position="bottom-right" richColors />` se monta una vez en `ClinicApp.tsx`; en cualquier otro lugar basta `import { toast } from "sonner"`.
- Al instalar componentes con `bunx shadcn add`, contesta **no** si pregunta por sobrescribir `button.tsx` (u otro ya existente). El registro de `alert-dialog` generó `import { cn } from "cn"` y agregó un paquete `cn` de npm: el import correcto es `@/lib/utils` y ese paquete no se usa.

## Documentación relacionada

- `ENDPOINTS.md`: referencia completa del API (cuerpos, respuestas y errores).
- `DASHBOARD.md`: contrato y cálculo de `GET /user/dashboard`.
- `AGENTS.md`: guía para asistentes de código.