"use client"

import { Link } from "react-router"
import { ChevronLeft, ChevronRight, Loader2, Search, Trash2 } from "lucide-react"

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
  dayOfMonth,
  formatWeekRange,
  shortDayName,
} from "@/lib/clinic-data"
import { cn } from "@/lib/utils"
import type { Appointment } from "@/types/clinic"

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
  } = useAgenda()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="text-sm text-muted-foreground">
            Citas de la semana en el consultorio.
          </p>
        </div>
        <NewAppointmentDialog />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="max-w-md">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Buscar por paciente o motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar cita"
          />
        </InputGroup>

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
          <Table className="min-w-[980px] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {weekDays.map((day) => (
                  <TableHead
                    key={day.date}
                    aria-current={day.isToday ? "date" : undefined}
                    className={cn(
                      "h-auto w-1/7 border-r border-border/70 px-3 py-2.5 text-center last:border-r-0",
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
                    onDelete={deleteAppointment}
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
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {outOfWeek.map((appt) => (
              <li key={appt.id}>
                {appt.date} · {appt.time} h ·{" "}
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
  onDelete: (id: string) => void
}) {
  return (
    <TableCell
      className={cn(
        "w-1/7 border-r border-border/70 p-2 align-top whitespace-normal last:border-r-0",
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
              </article>
            )
          })}
        </div>
      )}
    </TableCell>
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
