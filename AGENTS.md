# AGENTS.md

Compact guidance for OpenCode sessions working in this repo.

## Project

Dental clinic management UI demo (`DentalCare`). React 19 + TypeScript + Vite frontend, single-page app with no backend, router, or API — all state is in-memory via React context and seeded data.

## Commands

Package manager is **bun** (see `bun.lock`). Scripts:

- `bun run dev` — Vite dev server with HMR
- `bun run build` — runs `tsc -b` (typecheck via project references) THEN `vite build`. This is the only typecheck path; there is no separate `typecheck` script.
- `bun run lint` — `eslint .` over the repo
- `bun run preview` — preview the production build

Recommended order before committing changes: `lint` -> `build` (build catches type errors the linter won't, since the ESLint config is **not** type-aware).

There is **no test runner** configured. Do not assume `test`/`vitest`/`jest` exists.

## Architecture

- Entry: `index.html` -> `src/main.tsx` -> `src/ClinicApp.tsx`.
- Navigation is **Tab-based** (Base UI `Tabs`), not a router. Three views live in `src/pages/`: `AgendaView`, `DashboardView`, `PatientsView`. Do not introduce a router without reason.
- Global state: `src/context/ClinicProvider.tsx` exposes `useClinic()` (patients, appointments, mutations). All data is seeded in memory — no persistence layer.
- Domain types and seed data: `src/lib/clinic-data.ts`. Status labels and formatting helpers are Spanish (`es-MX`) and use a hardcoded `TODAY = "2026-08-04"` reference date in `ClinicProvider`. `parseISO` parses ISO dates as **local** dates to avoid TZ shifting — prefer it over `new Date(iso)` for date fields.

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