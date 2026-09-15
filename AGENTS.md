# AGENTS.md

Compact guidance for OpenCode sessions working in this repo.

## Project

Dental clinic management UI (`DentalCare`). React 19 + TypeScript + Vite frontend conectado al backend de Elysia/Bun documentado en `ENDPOINTS.md` (base URL en `VITE_API_URL`, default `http://localhost:3000`).

## Commands

Package manager is **bun** (see `bun.lock`). Scripts:

- `bun run dev` — Vite dev server with HMR
- `bun run build` — runs `tsc -b` (typecheck via project references) THEN `vite build`. This is the only typecheck path; there is no separate `typecheck` script.
- `bun run lint` — `eslint .` over the repo
- `bun run build:server` — same as `build` but outputs to `../backend/public` (production deploy; empties that dir)
- `bun run preview` — preview the production build
- `bun test` — Bun's built-in runner (`bun:test`) over `src/**/*.test.ts`. Single file: `bun test src/lib/patient-birthdate.test.ts`; by name: `bun test -t "calculateAge"`. There is no vitest/jest.

Recommended order before committing changes: `lint` -> `build` (build catches type errors the linter won't, since the ESLint config is **not** type-aware). Test files are excluded from `tsconfig.app.json`, so `tsc -b` does not type-check them.

## Architecture

- Entry: `index.html` -> `src/main.tsx` -> `src/ClinicApp.tsx` (solo providers: `QueryClientProvider` + `RouterProvider`).
- **Router en modo Data**: la configuración de rutas vive en `src/routes.tsx` (importable sin DOM, p. ej. para `matchRoutes`) y `src/router.tsx` solo crea el `createHashRouter` (el backend sirve el build desde `backend/public` y solo responde `/`; ver `bun run build:server`). `/login` es público; el resto cuelga de `AppLayout` (`src/layouts/`) detrás del loader `requireAuth`, que lee el token de Zustand (persistido en `localStorage`, hidratación sincrónica). Rutas: `/agenda`, `/dashboard`, `/pacientes` (lista + `<Outlet/>`) con hija `/pacientes/:id`, y `/pacientes/nuevo` como formulario de página completa. `/usuarios` y `/dashboard` además llevan el loader `requireMedico` (redirige a `/agenda`) y en `AppLayout` sus enlaces tienen `medicoOnly`, así que un asistente no los ve: el dashboard muestra las métricas financieras del médico y **no** debe ser visible para asistentes.
- **Alta de paciente desde una cita**: el diálogo de nueva cita se controla por URL (`/agenda?cita=nueva`) y su borrador vive en `ui.store` (`appointmentDraft`), así que el rodeo a `/pacientes/nuevo?redirectTo=…` no pierde lo capturado; al crear, el formulario vuelve a `redirectTo` con `&paciente=<id>` y el diálogo lo preselecciona.
- **Capas de datos**, de abajo hacia arriba:
  - `src/api/` — instancia de axios (`client.ts`, inyecta el header `token` y normaliza errores en `ApiError`), mapa de rutas (`endpoints.ts`) y DTOs del servidor (`types.ts`).
  - `src/actions/` — una función async por endpoint; traducen DTO <-> modelo de UI. No usar `api` directamente desde componentes.
  - `src/hooks/` — TanStack Query sobre las actions: `useAuth`, `usePatients`/`usePatient`, `useAgenda`, `useDashboard`. Las pantallas solo consumen hooks.
- **Estado global: Zustand** (`src/store/`). `auth.store.ts` guarda la sesión (persistida); `ui.store.ts` guarda filtros de UI (semana ISO y búsqueda de agenda, búsqueda de pacientes). El estado del servidor vive en TanStack Query, no en Zustand.
- **Días de atención**: `CLOSED_WEEKDAYS` en `clinic-data.ts` es el **único** lugar donde se define qué días cierra el consultorio (hoy solo los domingos). De ahí salen las columnas de la agenda (`onlyOpenDays`), el bloqueo del date-picker (`isClosedDay`), la validación del formulario de cita y los textos de la interfaz (`closedDaysLabel()`), así que cambiar el requisito es editar ese arreglo. Las citas ya guardadas en días cerrados no se ocultan: salen en `outOfWeek`.
- Selectores del formulario de nueva cita (y **solo** de ahí; la agenda es únicamente la tabla): `src/components/custom/calendar.tsx` (`Calendar` + `DatePicker`, popover de Base UI que deshabilita y tacha los días sin atención) y `src/components/custom/time-picker.tsx` (`TimePicker` por segmentos al estilo de time.openstatus.dev: `keydown`, flechas ↑↓ con vuelta, ←→ entre campos, avance automático al segundo dígito, `HH:mm` en 24 h).
- El popover del calendario va en `z-60`: el diálogo se monta en `z-50` y con el mismo valor quedaba **detrás**, en el DOM pero invisible.
- Tipos de dominio: `src/types/clinic.ts`. Mapeo DTO <-> dominio: `src/lib/mappers.ts`. Helpers de formato/agregación (`es-MX`): `src/lib/clinic-data.ts`; `parseISO` parsea fechas ISO como **locales** para evitar corrimientos de TZ — preferirla sobre `new Date(iso)` para campos de fecha.

## Puntos finos de la API (ver `ENDPOINTS.md`)

- El JWT va en un header propio `token`, no en `Authorization`.
- `PUT /pacientes/:id` con `tratamientos` **reemplaza** la lista completa: siempre mandar la lista final. Por eso la tabla de tratamientos (`components/custom/treatments-table.tsx`) se edita en bloque y guarda con un solo PUT (`usePatient().saveTreatments`), en vez de una petición por renglón.
- **Los importes llegan como string.** Las columnas `decimal` de Postgres se serializan como `"1200.00"`, y el `PUT` los valida como `number | null`: reenviarlos tal cual da 400. `toNumber` en `mappers.ts` los normaliza al entrar y al salir. Ojo: `?? 0` **no** sirve, solo cubre `null` y deja pasar el string (además rompía las sumas, que concatenaban).
- El id de tratamiento es `${id_paciente}-${fecha}`, así que **se repite** entre tratamientos del mismo día: no sirve como key de React por sí solo.
- `POST /pacientes` debe incluir `correo_medico` o el paciente no aparecerá en `GET /pacientes` (que filtra por el médico del token). `usePatients` lo rellena con el usuario en sesión.
- `GET /user/dashboard?year=` (ver `DASHBOARD.md`) devuelve las métricas del año **ya agregadas**: el dashboard es **una sola petición** y no reconstruye nada en el cliente. Dos detalles: `pacientesTotales` **no** está acotado por año (es el histórico de activos, porque `Paciente` no guarda fecha de alta) y no viene el dinero abonado — `toDashboard` lo deriva como `ventasTotales − dineroPorCobrar`, que es exacto mientras el backend calcule `dineroPorCobrar` como Σ(costo − cuenta) sin truncar negativos por renglón.
- `GET /citas` devuelve las citas agrupadas por día y filtradas por `year`/`month`/`week`/`query`. Las actions aplanan la respuesta; la agenda pide `year` + `week` (semana ISO, lunes a domingo) y reagrupa en 7 columnas por día **local**. Las citas cuyo día local cae fuera de la semana pedida (desfase de huso en la madrugada) se listan aparte en `outOfWeek` para no perderlas.
- El año que acompaña a `week` es el **año-semana** ISO, que a inicios de enero puede no ser el año calendario: usar `getISOWeek`/`isoWeekDates` de `clinic-data.ts`, no aritmética manual.
- `fecha_cita` es un timestamp ISO: se convierte a fecha/hora local en `mappers.ts` y se reconstruye con `toISODateTime` al escribir.

## Toolchain quirks

- **React Compiler is enabled** via `babel-plugin-react-compiler` wired through `@vitejs/plugin-react` + `@rolldown/plugin-babel` in `vite.config.ts`. Don't strip the babel plugin; the compiler preset depends on it. Avoid manual `useMemo`/`useCallback` micro-optimizations as the compiler handles them.
- **Tailwind v4** via `@tailwindcss/vite` (no `tailwind.config.js`). Theme tokens are defined as CSS variables in `src/index.css` using `@theme inline`.
- **shadcn/ui** with custom `base-vega` style (`components.json`), built on **`@base-ui/react`** (not Radix). Use `bunx shadcn` to add components; alias `@/components/ui` is where generated components live.
- UI components in `src/components/ui/` are **generated/vendor-managed** — prefer not hand-editing; fork into `src/components/custom/` for project-specific components (see `new-appointment-dialog.tsx`, `confirm-dialog.tsx`).
- `bunx shadcn add` may prompt to overwrite existing files like `button.tsx` — answer **no** (pipe `yes n |` when non-interactive). The `alert-dialog` registry item emitted `import { cn } from "cn"` and added an unrelated `cn` npm package: the correct import is `@/lib/utils` and that package must not be installed.
- **No `window.alert`/`window.confirm`.** Destructive actions use `ConfirmDialog` (`src/components/custom/confirm-dialog.tsx`, on top of shadcn `AlertDialog`): pass a `trigger` element, the texts, and an `onConfirm` that returns a promise. It handles the pending state (can't be closed meanwhile), stays open on failure so the user can retry, and fires the toast itself: success, the server's error message, or "cancelled" on Cancel/Esc. Used today for patient deactivation, assistant deletion and appointment deletion.
- Toasts are **Sonner**: a single `<Toaster position="bottom-right" richColors />` is mounted in `ClinicApp.tsx`; anywhere else just `import { toast } from "sonner"`.
- Path alias `@/*` -> `./src/*` is configured in both `tsconfig.json` and Vite `resolve.alias`. Use `@/` imports.
- `tsconfig.json` uses composite project references (`tsconfig.app.json` for `src`, `tsconfig.node.json` for `vite.config.ts`). Run `tsc -b`, not `tsc` directly.
- `verbatimModuleSyntax` is on — use `import { type Foo }` / `export type Foo` for type-only imports.

## Language

UI text and domain labels are **Spanish** (`es-MX`). Match this when adding user-facing strings; locale-aware formatting helpers (`formatCurrency`, `formatLongDate`, etc.) already exist in `clinic-data.ts` — reuse them.