"use client"

import { Link, NavLink, Outlet, useParams } from "react-router"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  UserPlus,
} from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { usePatients } from "@/hooks/usePatients"
import { formatAge, formatLongDate } from "@/lib/clinic-data"
import { downloadPatientsCsv } from "@/lib/patients-csv"
import { MOBILE_FAB } from "@/lib/responsive"
import { cn } from "@/lib/utils"
import type { Patient } from "@/types/clinic"

/** Tarjeta de un paciente en la lista; si tiene notas, el hover las muestra. */
function PatientCard({ patient: p }: { patient: Patient }) {
  const card = (
    <NavLink
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
  )

  if (!p.notes.trim()) return card

  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={200} render={<div />}>
        {card}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={6} className="isolate z-60">
          <Tooltip.Popup className="max-w-64 rounded-md border border-border/70 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
            {p.notes}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

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
  // Por debajo de lg no caben lista y expediente lado a lado: con un paciente
  // elegido solo se ve el expediente, con un botón para volver a la lista.
  const hasSelection = useParams().id !== undefined

  return (
    // En escritorio la vista ocupa justo el alto de la ventana (100dvh menos el
    // padding vertical de `main`): la página no se desplaza y cada columna
    // (lista y expediente) hace scroll por su cuenta.
    <div className="flex flex-col gap-6 lg:h-[calc(100dvh-4rem)]">
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:shrink-0",
          hasSelection && "max-lg:hidden",
        )}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pacientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Expedientes y control de tratamientos.
          </p>
        </div>
        <div className="flex items-center gap-2 max-sm:justify-end">
          {/* Exporta todos los pacientes, no solo los que deja el buscador. */}
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || patients.length === 0}
            onClick={() => downloadPatientsCsv(patients)}
            title="Descargar la lista de pacientes en CSV"
          >
            <Download data-icon="inline-start" />
            Exportar CSV
          </Button>
          <Button
            size="sm"
            className={MOBILE_FAB}
            nativeButton={false}
            render={<Link to="/pacientes/nuevo" />}
          >
            <UserPlus data-icon="inline-start" />
            Nuevo paciente
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[320px_1fr] lg:grid-rows-1">
        <div
          className={cn(
            "flex flex-col gap-3 lg:min-h-0",
            hasSelection && "max-lg:hidden",
          )}
        >
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
            <div className="flex flex-col gap-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {filtered.map((p) => (
                <PatientCard key={p.id} patient={p} />
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:min-h-0 lg:overflow-y-auto">
          {hasSelection && (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit lg:hidden"
              nativeButton={false}
              render={<Link to="/pacientes" />}
            >
              <ArrowLeft data-icon="inline-start" />
              Pacientes
            </Button>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  )
}
