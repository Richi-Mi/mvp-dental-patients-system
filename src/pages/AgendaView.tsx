"use client"

import * as React from "react"
import { Link } from "react-router"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Stethoscope,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NewAppointmentDialog } from "@/components/custom/new-appointment-dialog"
import { useAgenda, type AgendaDay } from "@/hooks/useAgenda"
import {
  STATUS_META,
  closedDaysLabel,
  dayOfMonth,
  formatLongDate,
  formatWeekRange,
  shortDayName,
} from "@/lib/clinic-data"
import { cn } from "@/lib/utils"
import type { Appointment, Usuario } from "@/types/clinic"

const fieldControl =
  "flex h-9 w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function AgendaView() {
  const {
    weekDays,
    outOfWeek,
    appointments,
    year,
    week,
    search,
    setSearch,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isLoading,
    isFetching,
    error,
    deleteAppointment,
    isDeleting,
    isAsistente,
    medicos,
    medicoActivo,
    medicoEmail,
    setMedico,
    isLoadingMedicos,
    medicosError,
  } = useAgenda()

  // El input es un borrador: la búsqueda solo se aplica al enviar el formulario
  // (Enter o el botón "Buscar"), no en cada tecla.
  const [term, setTerm] = React.useState(search)

  // `DELETE /citas/:id` solo alcanza las citas del médico del token, así que
  // un asistente no puede borrar en la agenda que está consultando.
  const canDelete = !isAsistente

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAsistente && medicoActivo
              ? `Citas de la semana de ${medicoActivo.nombre}.`
              : "Citas de la semana."}
            {closedDaysLabel() && ` El consultorio no atiende ${closedDaysLabel()}.`}
          </p>
        </div>
        <NewAppointmentDialog />
      </div>

      {isAsistente && (
        <MedicoPicker
          medicos={medicos}
          value={medicoEmail}
          onChange={setMedico}
          isLoading={isLoadingMedicos}
          error={medicosError}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          role="search"
          className="flex w-full max-w-md items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(term)
          }}
        >
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar por paciente o motivo..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              aria-label="Buscar cita"
            />
          </InputGroup>
          <Button type="submit" variant="outline">
            <Search />
            Buscar
          </Button>
        </form>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousWeek}
            aria-label="Semana anterior"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToCurrentWeek}
            className="min-w-56"
            title="Ir a la semana actual"
          >
            {formatWeekRange(year, week)}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextWeek}
            aria-label="Semana siguiente"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error instanceof Error
            ? error.message
            : "No se pudieron cargar las citas."}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando citas...
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl border border-border/70 transition-opacity",
            isFetching && "opacity-60",
          )}
        >
          <Table className="min-w-[840px] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {weekDays.map((day) => (
                  <TableHead
                    key={day.date}
                    aria-current={day.isToday ? "date" : undefined}
                    className={cn(
                      "h-auto border-r border-border/70 px-3 py-2.5 text-center last:border-r-0",
                      day.isToday ? "bg-primary/10" : "bg-muted/40",
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={cn(
                          "text-xs font-medium uppercase tracking-wide",
                          day.isToday ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {shortDayName(day.date)}
                      </span>
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                          day.isToday
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground",
                        )}
                      >
                        {dayOfMonth(day.date)}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow className="hover:bg-transparent">
                {weekDays.map((day) => (
                  <DayColumn
                    key={day.date}
                    day={day}
                    isDeleting={isDeleting}
                    onDelete={canDelete ? deleteAppointment : undefined}
                  />
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && appointments.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No hay citas para esta semana
          {search.trim() ? ` que coincidan con “${search.trim()}”` : ""}.
        </p>
      )}

      {outOfWeek.length > 0 && (
        <div className="rounded-lg border border-dashed border-border/70 px-4 py-3 text-sm">
          <p className="mb-2 font-medium text-foreground">
            Citas fuera de los días mostrados
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            Agendadas en días sin atención{closedDaysLabel() && ` (${closedDaysLabel()})`}{" "}
            o en otra semana.
          </p>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {outOfWeek.map((appt) => (
              <li key={appt.id}>
                {formatLongDate(appt.date)} · {appt.time} h ·{" "}
                <PatientLink appointment={appt} /> — {appt.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function DayColumn({
  day,
  isDeleting,
  onDelete,
}: {
  day: AgendaDay
  isDeleting: boolean
  /** Sin `onDelete` las tarjetas se muestran en modo solo lectura. */
  onDelete?: (id: string) => void
}) {
  return (
    <TableCell
      className={cn(
        "border-r border-border/70 p-2 align-top whitespace-normal last:border-r-0",
        day.isToday && "bg-primary/5",
      )}
    >
      {day.items.length === 0 ? (
        // `min-height` en un <td> lo ignora el navegador: va en el contenido.
        <div className="flex min-h-32 items-center justify-center">
          <p className="text-xs text-muted-foreground/70">Sin citas</p>
        </div>
      ) : (
        <div className="flex min-h-32 flex-col gap-2">
          {day.items.map((appt) => {
            const status = STATUS_META[appt.status]
            return (
              <article
                key={appt.id}
                className="group flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card p-2.5 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {appt.time}
                  </span>
                  <Badge className={cn(status.className, "text-[10px]")}>
                    {status.label}
                  </Badge>
                </div>

                <PatientLink appointment={appt} />

                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {appt.motivo}
                </p>

                {onDelete && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    aria-label={`Eliminar cita de ${appt.patientName || "paciente"}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Eliminar esta cita? La acción no se puede deshacer.",
                        )
                      ) {
                        onDelete(appt.id)
                      }
                    }}
                    className="flex items-center gap-1 self-end text-xs text-muted-foreground opacity-0 transition-opacity hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    Eliminar
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </TableCell>
  )
}

/**
 * Selector de médico para los asistentes: define de quién es la agenda que se
 * ve y para quién se agendan las citas nuevas.
 */
function MedicoPicker({
  medicos,
  value,
  onChange,
  isLoading,
  error,
}: {
  medicos: Usuario[]
  value: string | null
  onChange: (correo: string) => void
  isLoading: boolean
  error: unknown
}) {
  if (error) {
    return (
      <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error instanceof Error
          ? error.message
          : "No se pudieron cargar los médicos."}
      </p>
    )
  }

  if (!isLoading && medicos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
        No hay médicos activos registrados; pide a un médico que active su
        cuenta para poder agendar.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card p-3 sm:max-w-md">
      <label
        htmlFor="agenda-medico"
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <Stethoscope className="size-3.5" />
        Agenda del médico
      </label>
      <select
        id="agenda-medico"
        className={fieldControl}
        value={value ?? ""}
        disabled={isLoading}
        onChange={(e) => onChange(e.target.value)}
      >
        {isLoading && <option value="">Cargando médicos...</option>}
        {medicos.map((medico) => (
          <option key={medico.correo} value={medico.correo}>
            {medico.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}

/** El nombre del paciente abre su expediente. */
function PatientLink({ appointment }: { appointment: Appointment }) {
  return (
    <Link
      to={`/pacientes/${appointment.patientId}`}
      className="truncate text-sm font-medium text-primary underline-offset-2 hover:underline"
      title={appointment.patientName || `Paciente #${appointment.patientId}`}
    >
      {appointment.patientName || `Paciente #${appointment.patientId}`}
    </Link>
  )
}
