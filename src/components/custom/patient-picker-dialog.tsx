"use client"

import * as React from "react"
import { Check, ChevronRight, Loader2, Search, UserPlus, UserSearch } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ResponsiveDialogContent } from "@/components/custom/responsive-dialog"
import { formatAge } from "@/lib/clinic-data"
import { filterPatients } from "@/lib/patient-search"
import { cn } from "@/lib/utils"
import type { Patient } from "@/types/clinic"

type PatientPickerDialogProps = {
  /** Id del botón, para el `<label htmlFor>` del formulario. */
  id?: string
  patients: Patient[]
  isLoading: boolean
  /** Id del paciente elegido, como texto (así lo guarda el borrador); "" si no hay. */
  selectedId: string
  onSelect: (patient: Patient) => void
  /** Sin él no se muestra el botón "Nuevo paciente". */
  onNewPatient?: () => void
}

/**
 * Botón "Seleccionar paciente" que abre una ventana con buscador y la lista de
 * pacientes. Va dentro del diálogo de cita, así que es un diálogo anidado:
 * Esc, la X o un clic fuera cierran solo esta ventana, y el foco vuelve al
 * botón. El diálogo padre se oculta mientras está abierta
 * (`data-nested-dialog-open`).
 *
 * La búsqueda es local a la ventana: no toca la de la pantalla Pacientes
 * (`ui.store`).
 */
export function PatientPickerDialog({
  id,
  patients,
  isLoading,
  selectedId,
  onSelect,
  onNewPatient,
}: PatientPickerDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const searchRef = React.useRef<HTMLInputElement>(null)

  const selected = patients.find((p) => String(p.id) === selectedId)
  const results = filterPatients(patients, search)

  function choose(patient: Patient) {
    onSelect(patient)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Cada vez que se abre, la búsqueda empieza vacía.
        if (next) setSearch("")
        setOpen(next)
      }}
    >
      <DialogTrigger
        id={id}
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal max-sm:text-base"
          />
        }
      >
        <UserSearch data-icon="inline-start" className="text-muted-foreground" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            !selected && "text-muted-foreground",
          )}
        >
          {selected
            ? selected.name
            : selectedId && isLoading
              ? "Cargando paciente..."
              : "Seleccionar paciente"}
        </span>
        <ChevronRight data-icon="inline-end" className="text-muted-foreground" />
      </DialogTrigger>

      {/* Alto fijo: solo la lista hace scroll y el botón flotante no se mueve. */}
      <ResponsiveDialogContent
        initialFocus={searchRef}
        className="flex h-[min(36rem,85dvh)] flex-col gap-4 overflow-hidden sm:max-w-md max-sm:h-[85dvh] max-sm:overflow-hidden"
      >
        <DialogHeader className="pr-8">
          <DialogTitle>Seleccionar paciente</DialogTitle>
          <DialogDescription>
            Busca por nombre, teléfono o correo.
          </DialogDescription>
        </DialogHeader>

        <InputGroup className="shrink-0">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            type="search"
            placeholder="Buscar paciente..."
            aria-label="Buscar paciente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              // Enter elige el primer resultado.
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return
              e.preventDefault()
              if (results[0]) choose(results[0])
            }}
          />
        </InputGroup>

        <div
          className={cn(
            "-mx-1 min-h-0 flex-1 overflow-y-auto px-1",
            // Espacio para que el botón flotante no tape la última fila.
            onNewPatient && "pb-20",
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando pacientes...
            </div>
          ) : results.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              {patients.length === 0
                ? "Aún no hay pacientes registrados."
                : "Ningún paciente coincide con la búsqueda."}
            </p>
          ) : (
            <div className="flex flex-col gap-2 py-1">
              {results.map((p) => (
                <PatientOption
                  key={p.id}
                  patient={p}
                  selected={p.id === selected?.id}
                  onClick={() => choose(p)}
                />
              ))}
            </div>
          )}
        </div>

        {onNewPatient && (
          <Button
            type="button"
            size="lg"
            className="absolute right-6 bottom-6 rounded-full px-4 shadow-lg max-sm:right-4 max-sm:bottom-4"
            onClick={onNewPatient}
          >
            <UserPlus data-icon="inline-start" />
            Nuevo paciente
          </Button>
        )}
      </ResponsiveDialogContent>
    </Dialog>
  )
}

/** Un paciente de la lista, con el mismo aspecto que en la pantalla Pacientes. */
function PatientOption({
  patient: p,
  selected,
  onClick,
}: {
  patient: Patient
  selected: boolean
  onClick: () => void
}) {
  const details = [p.phone || "Sin teléfono", p.birthDate && formatAge(p.birthDate)]
    .filter(Boolean)
    .join(" · ")

  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border/70 bg-card hover:bg-muted",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {p.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
        <p className="truncate text-xs text-muted-foreground">{details}</p>
      </div>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  )
}
