# AGENTS.md

Compact guidance for OpenCode sessions working in this repo.

## Project

Dental clinic management UI (`DentalCare`). React 19 + TypeScript + Vite frontend conectado al backend de Elysia/Bun documentado en `ENDPOINTS.md` (base URL en `VITE_API_URL`, default `http://localhost:3000`).

## Commands

Package manager is **bun** (see `bun.lock`). Scripts:

- `bun run dev` — Vite dev server with HMR
- `bun run build` — runs `tsc -b` (typecheck via project references) THEN `vite build`. This is the only typecheck path; there is no separate `typecheck` script.
- `bun run lint` — `eslint .` over the repo
- `bun run preview` — preview the production build

Recommended order before committing changes: `lint` -> `build` (build catches type errors the linter won't, since the ESLint config is **not** type-aware).

There is **no test runner** configured. Do not assume `test`/`vitest`/`jest` exists.

## Architecture

- Entry: `index.html` -> `src/main.tsx` -> `src/ClinicApp.tsx` (solo providers: `QueryClientProvider` + `RouterProvider`).
- **Router en modo Data** (`src/router.tsx`, `createBrowserRouter`). `/login` es público; el resto cuelga de `AppLayout` (`src/layouts/`) detrás del loader `requireAuth`, que lee el token de Zustand (persistido en `localStorage`, hidratación sincrónica). Rutas: `/agenda`, `/dashboard`, `/pacientes` (lista + `<Outlet/>`) con hija `/pacientes/:id`.
- **Capas de datos**, de abajo hacia arriba:
  - `src/api/` — instancia de axios (`client.ts`, inyecta el header `token` y normaliza errores en `ApiError`), mapa de rutas (`endpoints.ts`) y DTOs del servidor (`types.ts`).
  - `src/actions/` — una función async por endpoint; traducen DTO <-> modelo de UI. No usar `api` directamente desde componentes.
  - `src/hooks/` — TanStack Query sobre las actions: `useAuth`, `usePatients`/`usePatient`/`usePatientsWithTreatments`, `useAgenda`/`useAgendaYear`. Las pantallas solo consumen hooks.
- **Estado global: Zustand** (`src/store/`). `auth.store.ts` guarda la sesión (persistida); `ui.store.ts` guarda filtros de UI (semana ISO y búsqueda de agenda, búsqueda de pacientes). El estado del servidor vive en TanStack Query, no en Zustand.
- Tipos de dominio: `src/types/clinic.ts`. Mapeo DTO <-> dominio: `src/lib/mappers.ts`. Helpers de formato/agregación (`es-MX`): `src/lib/clinic-data.ts`; `parseISO` parsea fechas ISO como **locales** para evitar corrimientos de TZ — preferirla sobre `new Date(iso)` para campos de fecha.

## Puntos finos de la API (ver `ENDPOINTS.md`)

- El JWT va en un header propio `token`, no en `Authorization`.
- `PUT /pacientes/:id` con `tratamientos` **reemplaza** la lista completa: siempre mandar la lista final (lo hacen las mutaciones de `usePatient`).
- `POST /pacientes` debe incluir `correo_medico` o el paciente no aparecerá en `GET /pacientes` (que filtra por el médico del token). `usePatients` lo rellena con el usuario en sesión.
- `GET /citas` devuelve las citas agrupadas por día y filtradas por `year`/`month`/`week`/`query`. Las actions aplanan la respuesta; la agenda pide `year` + `week` (semana ISO, lunes a domingo) y reagrupa en 7 columnas por día **local**, mientras que el dashboard hace 12 llamadas por `month`. Las citas cuyo día local cae fuera de la semana pedida (desfase de huso en la madrugada) se listan aparte en `outOfWeek` para no perderlas.
- El año que acompaña a `week` es el **año-semana** ISO, que a inicios de enero puede no ser el año calendario: usar `getISOWeek`/`isoWeekDates` de `clinic-data.ts`, no aritmética manual.
- `fecha_cita` es un timestamp ISO: se convierte a fecha/hora local en `mappers.ts` y se reconstruye con `toISODateTime` al escribir.

## Toolchain quirks

- **React Compiler is enabled** via `babel-plugin-react-compiler` wired through `@vitejs/plugin-react` + `@rolldown/plugin-babel` in `vite.config.ts`. Don't strip the babel plugin; the compiler preset depends on it. Avoid manual `useMemo`/`useCallback` micro-optimizations as the compiler handles them.
- **Tailwind v4** via `@tailwindcss/vite` (no `tailwind.config.js`). Theme tokens are defined as CSS variables in `src/index.css` using `@theme inline`.
- **shadcn/ui** with custom `base-vega` style (`components.json`), built on **`@base-ui/react`** (not Radix). Use `bunx shadcn` to add components; alias `@/components/ui` is where generated components live.
- UI components in `src/components/ui/` are **generated/vendor-managed** — prefer not hand-editing; fork into `src/components/custom/` for project-specific components (see `new-appointment-dialog.tsx`, `add-treatment-dialog.tsx`).
- Path alias `@/*` -> `./src/*` is configured in both `tsconfig.json` and Vite `resolve.alias`. Use `@/` imports.
- `tsconfig.json` uses composite project references (`tsconfig.app.json` for `src`, `tsconfig.node.json` for `vite.config.ts`). Run `tsc -b`, not `tsc` directly.
- `verbatimModuleSyntax` is on — use `import { type Foo }` / `export type Foo` for type-only imports.

## Language

UI text and domain labels are **Spanish** (`es-MX`). Match this when adding user-facing strings; locale-aware formatting helpers (`formatCurrency`, `formatLongDate`, etc.) already exist in `clinic-data.ts` — reuse them.