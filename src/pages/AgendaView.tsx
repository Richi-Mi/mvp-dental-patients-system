"use client"

import * as React from "react"
import { Link } from "react-router"
import {
  ChevronLeft,
  ChevronRight,
  FunnelX,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { NewAppointmentDialog } from "@/components/custom/new-appointment-dialog"
import { useAgenda, type AgendaDay } from "@/hooks/useAgenda"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { useNewAppointmentDialog } from "@/hooks/useNewAppointmentDialog"
import {
  APPOINTMENT_STATUSES,
  STATUS_META,
  closedDaysLabel,
  dayOfMonth,
  formatDayName,
  formatLongDate,
  formatWeekRange,
  nextOpenDay,
  shiftOpenDay,
  shortDayName,
  todayISO,
} from "@/lib/clinic-data"
import { cn } from "@/lib/utils"
import type { Appointment, AppointmentStatus, Usuario } from "@/types/clinic"

const fieldControl =
  "flex h-9 w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:text-base"

/**
 * ¿El foco está donde Shift + flechas ya tiene un uso propio (seleccionar
 * texto en un campo, recorrer un selector o un diálogo)? Ahí no se roba la
 * tecla para los atajos de la agenda.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest(
      'input, textarea, select, [role="listbox"], [role="menu"], [role="dialog"]',
    ) !== null
  )
}

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
    isCurrentWeek,
    dayParam,
    selectedDay,
    selectDay,
    clearFilters,
    isLoading,
    isFetching,
    error,
    deleteAppointment,
    isDeleting,
    updateAppointment,
    updateError,
    isAsistente,
    medicos,
    medicoActivo,
    medicoEmail,
    setMedico,
    isLoadingMedicos,
    medicosError,
  } = useAgenda()

  // El input es un borrador: la búsqueda solo se aplica al enviar el formulario
  // (Enter o el botón "Buscar"), no en cada tecla. Si `?term=` cambia por otra
  // vía (atrás/adelante del navegador) el borrador se alinea con la URL.
  const [term, setTerm] = React.useState(search)
  const [syncedSearch, setSyncedSearch] = React.useState(search)
  if (search !== syncedSearch) {
    setSyncedSearch(search)
    setTerm(search)
  }

  // En teléfono se ve un solo día (`?day=`) y las flechas avanzan de día en
  // día; al cruzar a otra semana también cambian `?year=&week=`.
  const isMobile = useIsMobile()
  const visibleDays = isMobile && selectedDay ? [selectedDay] : weekDays

  const goToPrevious =
    isMobile && selectedDay
      ? () => selectDay(shiftOpenDay(selectedDay.date, -1))
      : goToPreviousWeek
  const goToNext =
    isMobile && selectedDay
      ? () => selectDay(shiftOpenDay(selectedDay.date, 1))
      : goToNextWeek
  const goToCurrent = isMobile
    ? () => selectDay(nextOpenDay(todayISO()))
    : goToCurrentWeek

  // Atajos: Shift + ←/→ cambian de semana y Shift + ↑ abre "Nueva cita".
  // `useEffectEvent` lee siempre los handlers actuales sin re-suscribir el
  // listener en cada render.
  const newAppointment = useNewAppointmentDialog()
  const onShortcut = React.useEffectEvent((e: KeyboardEvent) => {
    if (!e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return
    if (e.defaultPrevented || newAppointment.open) return
    if (isInteractiveTarget(e.target)) return

    if (e.key === "ArrowLeft") goToPreviousWeek()
    else if (e.key === "ArrowRight") goToNextWeek()
    else if (e.key === "ArrowUp" && !e.repeat) newAppointment.setOpen(true)
    else return
    e.preventDefault()
  })

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => onShortcut(e)
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // El día elegido solo filtra en teléfono; en escritorio no se ve.
  const hasFilters =
    search !== "" ||
    !isCurrentWeek ||
    (isMobile && dayParam !== null && dayParam !== todayISO())

  // `PUT` y `DELETE /citas/:id` solo alcanzan las citas del médico del token,
  // así que un asistente no puede editar ni borrar en la agenda que consulta.
  const canEdit = !isAsistente

  const changeStatus = React.useCallback(
    (id: string, status: AppointmentStatus) =>
      updateAppointment({ id, input: { status } }),
    [updateAppointment],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAsistente && medicoActivo
              ? `Citas ${isMobile ? "del día" : "de la semana"} de ${medicoActivo.nombre}.`
              : `Citas ${isMobile ? "del día" : "de la semana"}.`}
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
          <Button type="submit" variant="outline" className="max-sm:min-w-11">
            <Search />
            <span className="max-sm:sr-only">Buscar</span>
          </Button>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTerm("")
                clearFilters()
              }}
              className="max-sm:min-w-11"
              title={
                isMobile
                  ? "Quitar la búsqueda y volver a hoy"
                  : "Quitar la búsqueda y volver a la semana actual"
              }
            >
              <FunnelX />
              {/* En teléfono solo cabe el icono junto al buscador. */}
              <span className="max-sm:sr-only">Limpiar</span>
            </Button>
          )}
        </form>

        <div className="flex items-center justify-between gap-1 sm:justify-start">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            aria-label={isMobile ? "Día anterior" : "Semana anterior"}
            title={isMobile ? undefined : "Semana anterior (Shift + ←)"}
            aria-keyshortcuts={isMobile ? undefined : "Shift+ArrowLeft"}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToCurrent}
            className="min-w-0 flex-1 sm:min-w-56 sm:flex-none"
            title={isMobile ? "Ir a hoy" : "Ir a la semana actual"}
          >
            {isMobile && selectedDay
              ? `${formatDayName(selectedDay.date)}, ${formatLongDate(selectedDay.date)}`
              : formatWeekRange(year, week)}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            aria-label={isMobile ? "Día siguiente" : "Semana siguiente"}
            title={isMobile ? undefined : "Semana siguiente (Shift + →)"}
            aria-keyshortcuts={isMobile ? undefined : "Shift+ArrowRight"}
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

      {updateError && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {updateError instanceof Error
            ? updateError.message
            : "No se pudo actualizar el estatus de la cita."}
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
          {isMobile && selectedDay ? (
            <div
              className={cn("rounded-xl p-2", selectedDay.isToday && "bg-primary/5")}
            >
              <DayAppointments
                day={selectedDay}
                isDeleting={isDeleting}
                onDelete={canEdit ? deleteAppointment : undefined}
                onStatusChange={canEdit ? changeStatus : undefined}
              />
            </div>
          ) : (
            <Table className={cn("table-fixed", !isMobile && "min-w-210")}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {visibleDays.map((day) => (
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
                  {visibleDays.map((day) => (
                    <DayColumn
                      key={day.date}
                      day={day}
                      isDeleting={isDeleting}
                      onDelete={canEdit ? deleteAppointment : undefined}
                      onStatusChange={canEdit ? changeStatus : undefined}
                    />
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          )}
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

type DayAppointmentsProps = {
  day: AgendaDay
  isDeleting: boolean
  /** Sin `onDelete` ni `onStatusChange` las tarjetas son de solo lectura. */
  onDelete?: (id: string) => Promise<unknown>
  onStatusChange?: (id: string, status: AppointmentStatus) => Promise<unknown>
}

function DayColumn(props: DayAppointmentsProps) {
  return (
    <TableCell
      className={cn(
        "border-r border-border/70 p-2 align-top whitespace-normal last:border-r-0",
        props.day.isToday && "bg-primary/5",
      )}
    >
      <DayAppointments {...props} />
    </TableCell>
  )
}

/** Tarjetas de las citas de un día: columna de la semana o vista de teléfono. */
function DayAppointments({
  day,
  isDeleting,
  onDelete,
  onStatusChange,
}: DayAppointmentsProps) {
  return day.items.length === 0 ? (
    // `min-height` en un <td> lo ignora el navegador: va en el contenido.
    <div className="flex min-h-32 items-center justify-center">
      <p className="text-xs text-muted-foreground/70 max-sm:text-sm">Sin citas</p>
    </div>
  ) : (
    <div className="flex min-h-32 flex-col gap-2">
      {day.items.map((appt) => {
        const status = STATUS_META[appt.status]
        return (
          <article
            key={appt.id}
            className="group flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-1 bg-sky-100 px-2.5 py-1.5 max-lg:flex-wrap max-sm:px-3 max-sm:py-2 dark:bg-sky-950/60">
              <span className="text-sm font-semibold tabular-nums text-foreground max-sm:text-base">
                {appt.time}
              </span>
              {onStatusChange ? (
                <StatusSelect
                  appointment={appt}
                  onChange={onStatusChange}
                />
              ) : (
                <Badge className={cn(status.className, "text-[10px] max-sm:text-xs")}>
                  {status.label}
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-1.5 p-2.5 max-sm:p-3">
              <PatientLink appointment={appt} />

              <p className="line-clamp-2 text-xs text-muted-foreground max-sm:text-sm">
                {appt.motivo}
              </p>

              {onDelete && (
                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      disabled={isDeleting}
                      aria-label={`Eliminar cita de ${appt.patientName || "paciente"}`}
                      className="flex items-center gap-1 self-end text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-600 focus-visible:opacity-100 disabled:opacity-50 max-lg:touch-hitbox max-lg:opacity-100 max-lg:disabled:opacity-50 max-sm:text-sm"
                    >
                      <Trash2 className="size-3.5 max-sm:size-4" />
                      Eliminar
                    </button>
                  }
                  title="¿Eliminar esta cita?"
                  description={`${formatLongDate(appt.date)} · ${appt.time} h${appt.patientName ? ` — ${appt.patientName}` : ""}. La acción no se puede deshacer.`}
                  confirmLabel="Eliminar cita"
                  successMessage="La cita se eliminó."
                  cancelMessage="Se canceló la eliminación de la cita."
                  onConfirm={() => onDelete(appt.id)}
                />
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

/**
 * Chip de estatus que abre un selector y guarda con `PUT /citas/:id`. Mientras
 * se guarda muestra el estatus elegido; si falla, regresa al que tiene la cita.
 */
function StatusSelect({
  appointment,
  onChange,
}: {
  appointment: Appointment
  onChange: (id: string, status: AppointmentStatus) => Promise<unknown>
}) {
  const [pending, setPending] = React.useState<AppointmentStatus | null>(null)
  const value = pending ?? appointment.status
  const meta = STATUS_META[value]

  return (
    <Select
      value={value}
      disabled={pending !== null}
      onValueChange={(next) => {
        if (!next || next === appointment.status) return
        setPending(next)
        onChange(appointment.id, next)
          // El error se muestra arriba de la agenda (`updateError`).
          .catch(() => {})
          .finally(() => setPending(null))
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Estatus de la cita: ${meta.label}`}
        className={cn(
          meta.className,
          "h-5 cursor-pointer gap-0.5 rounded-4xl border-transparent py-0 pr-1.5 pl-2 text-[10px] font-medium shadow-none data-[size=sm]:h-5 [&_svg]:size-3 [&_svg]:text-current",
          "max-lg:touch-hitbox max-sm:gap-1 max-sm:pr-2 max-sm:pl-3 max-sm:text-xs max-sm:data-[size=sm]:h-8 max-sm:[&_svg]:size-3.5",
        )}
      >
        {pending !== null && <Loader2 className="animate-spin" />}
        {meta.label}
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        {APPOINTMENT_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_META[status].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
      className="text-sm font-medium wrap-break-word text-primary underline-offset-2 hover:underline max-lg:touch-hitbox max-sm:text-base"
      title={appointment.patientName || `Paciente #${appointment.patientId}`}
    >
      {appointment.patientName || `Paciente #${appointment.patientId}`}
    </Link>
  )
}
