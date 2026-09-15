"use client"

import { Link, NavLink, Outlet } from "react-router"
import { Tooltip } from "@base-ui/react/tooltip"
import { ChevronRight, Loader2, Search, UserPlus } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { usePatients } from "@/hooks/usePatients"
import { formatAge, formatLongDate } from "@/lib/clinic-data"
import { cn } from "@/lib/utils"

/** Edad del paciente; al pasar el cursor muestra la fecha de nacimiento. */
function PatientAge({ birthDate }: { birthDate: string | null }) {
  if (!birthDate) return <span>Edad sin registrar</span>

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        delay={200}
        render={
          <span className="cursor-help underline decoration-dotted underline-offset-2" />
        }
      >
        {formatAge(birthDate)}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={6} className="isolate z-60">
          <Tooltip.Popup className="rounded-md border border-border/70 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
            Nació el {formatLongDate(birthDate)}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function PatientsView() {
  const { filtered, patients, search, setSearch, isLoading, error } =
    usePatients()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pacientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Expedientes y control de tratamientos.
          </p>
        </div>
        <Button size="sm" render={<Link to="/pacientes/nuevo" />}>
          <UserPlus data-icon="inline-start" />
          Nuevo paciente
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-3">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar paciente"
            />
          </InputGroup>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error instanceof Error
                ? error.message
                : "No se pudieron cargar los pacientes."}
            </p>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando pacientes...
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              {patients.length === 0
                ? "Aún no hay pacientes registrados."
                : "Ningún paciente coincide con la búsqueda."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((p) => (
                <NavLink
                  key={p.id}
                  to={`/pacientes/${p.id}`}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/70 bg-card hover:bg-muted",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full text-sm font-medium",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <PatientAge birthDate={p.birthDate} />
                          {p.gender ? ` · ${p.gender}` : ""}
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          "size-4 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground/50",
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <Outlet />
      </div>
    </div>
  )
}
