"use client"

import * as React from "react"
import { Link } from "react-router"
import {
  ChevronLeft,
  ChevronRight,
  FunnelX,
  Loader2,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Trash2,
} from "lucide-react"

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
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { NewAppointmentDialog } from "@/components/custom/new-appointment-dialog"
import { SyncButton } from "@/components/custom/sync-button"
import { useAgenda, type AgendaDay } from "@/hooks/useAgenda"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { useNewAppointmentDialog } from "@/hooks/useNewAppointmentDialog"
import {
  AGENDA_HOURS,
  APPOINTMENT_STATUSES,
  CLOSING_HOUR,
  OPENING_HOUR,
  STATUS_META,
  closedDaysLabel,
  dayOfMonth,
  defaultEndTime,
  formatDayName,
  formatLongDate,
  formatTimeRange,
  formatWeekRange,
  hourLabel,
  layoutDay,
  nextOpenDay,
  shiftOpenDay,
  shortDayName,
  todayISO,
  type DayLayout,
} from "@/lib/clinic-data"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/store/ui.store"
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

  const changeStatus = React.useCallback(
    (id: string, status: AppointmentStatus) =>
      updateAppointment({ id, input: { status } }),
    [updateAppointment],
  )

  // Hueco libre de la cuadrícula -> diálogo de nueva cita con ese día y esa
  // hora ya puestos (y una hora de duración, que se puede cambiar). El
  // borrador vive en `ui.store`, así que basta dejarlo listo antes de abrir
  // (`?cita=nueva`).
  const setDraft = useUiStore((s) => s.setAppointmentDraft)
  const scheduleAt = (date: string, hour: number) => {
    const time = hourLabel(hour)
    setDraft({ date, time, endTime: defaultEndTime(time) })
    newAppointment.setOpen(true)
  }

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
        <div className="flex items-center gap-2 max-sm:justify-end">
          <SyncButton />
          <NewAppointmentDialog />
        </div>
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
            <DaySchedule
              day={selectedDay}
              isDeleting={isDeleting}
              onEdit={newAppointment.editAppointment}
              onDelete={deleteAppointment}
              onStatusChange={changeStatus}
            />
          ) : (
            <WeekSchedule
              days={weekDays}
              isDeleting={isDeleting}
              onEdit={newAppointment.editAppointment}
              onDelete={deleteAppointment}
              onStatusChange={changeStatus}
              onSchedule={scheduleAt}
            />
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
                {formatLongDate(appt.date)} ·{" "}
                {formatTimeRange(appt.time, appt.endTime)} h ·{" "}
                <PatientLink appointment={appt} /> — {appt.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type AppointmentActions = {
  isDeleting: boolean
  /** Sin `onEdit`, `onDelete` ni `onStatusChange` las tarjetas son de solo lectura. */
  onEdit?: (id: string) => void
  onDelete?: (id: string) => Promise<unknown>
  onStatusChange?: (id: string, status: AppointmentStatus) => Promise<unknown>
}

/**
 * Acciones de la tarjeta: discretas en escritorio (aparecen al pasar el
 * puntero) y siempre visibles donde no hay hover.
 */
const CARD_ACTION =
  "flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50 max-lg:touch-hitbox max-lg:opacity-100 max-lg:disabled:opacity-50 max-sm:text-sm"

/** Etiqueta de la fila de las citas que caen fuera del horario de atención. */
const OUT_OF_HOURS_LABEL = "Fuera"
const OUT_OF_HOURS_TITLE = `Citas fuera del horario de atención (${hourLabel(OPENING_HOUR)} a ${hourLabel(CLOSING_HOUR)} h)`

/**
 * Horario semanal en CSS Grid: una fila por hora de atención y una columna por
 * día abierto. Cada cita abarca las filas que dura (ver `layoutDay`): las que
 * empiezan en la misma hora se apilan en un bloque y las que se enciman con
 * otra van en carriles, una junto a la otra. Las horas que no ocupa ninguna
 * cita son botones para agendar ahí.
 *
 * Es la vista de tablet y escritorio; en teléfono se cambia por `DaySchedule`,
 * que muestra el mismo horario de un solo día en una columna.
 */
function WeekSchedule({
  days,
  onSchedule,
  ...actions
}: AppointmentActions & {
  days: AgendaDay[]
  /** Agenda una cita nueva en una hora libre de la cuadrícula. */
  onSchedule: (date: string, hour: number) => void
}) {
  const columns = days.map((day) => ({ day, ...layoutDay(day.items) }))
  const hasOutOfHours = columns.some((column) => column.outOfHours.length > 0)
  // Filas bajo el encabezado de los días: una por hora y, si hace falta, la de
  // las citas fuera de horario.
  const bodyRows = AGENDA_HOURS.length + (hasOutOfHours ? 1 : 0)
  // Cada día es tan ancho como sus carriles: si hay citas encimadas, cada una
  // conserva el ancho de una columna normal en vez de quedar ilegible.
  const dayWidths = columns.map(({ lanes }) => `minmax(0, ${lanes}fr)`).join(" ")

  return (
    <div className="relative w-full overflow-x-auto rounded-[inherit]">
      <p id="agenda-semana-descripcion" className="sr-only">
        Las filas son las horas de atención (de {hourLabel(OPENING_HOUR)} a{" "}
        {hourLabel(CLOSING_HOUR)} h) y las columnas los días que abre el
        consultorio. Cada cita abarca las horas que dura.
      </p>

      <div
        role="group"
        aria-label="Horario de la semana"
        aria-describedby="agenda-semana-descripcion"
        className="grid min-w-224"
        style={{
          gridTemplateColumns: `4rem ${dayWidths}`,
          gridTemplateRows: `auto repeat(${bodyRows}, minmax(4rem, auto))`,
        }}
      >
        <StickyCell gridRow={1} className="z-20 border-b" />

        {AGENDA_HOURS.map((hour, row) => (
          <StickyCell
            key={hour}
            gridRow={row + 2}
            className={cn(row < bodyRows - 1 && "border-b")}
          >
            {hourLabel(hour)}
          </StickyCell>
        ))}

        {/* Solo aparece si hay citas que no caben en ninguna hora del horario. */}
        {hasOutOfHours && (
          <StickyCell gridRow={bodyRows + 1} title={OUT_OF_HOURS_TITLE}>
            {OUT_OF_HOURS_LABEL}
          </StickyCell>
        )}

        {columns.map((column, index) => (
          <DayColumn
            key={column.day.date}
            {...column}
            gridColumn={index + 2}
            bodyRows={bodyRows}
            showOutOfHours={hasOutOfHours}
            onSchedule={(hour) => onSchedule(column.day.date, hour)}
            {...actions}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Celda de la columna de horas, fija a la izquierda al desplazar en tablet.
 * El fondo es opaco para tapar lo que pasa por debajo; el tono va encima.
 * Las horas se ocultan a los lectores de pantalla: cada botón y cada cita ya
 * dicen su hora.
 */
function StickyCell({
  gridRow,
  title,
  className,
  children,
}: {
  gridRow: number
  title?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      aria-hidden
      title={title}
      className={cn(
        "sticky left-0 z-10 border-r border-border/70 bg-background",
        className,
      )}
      style={{ gridRow, gridColumn: 1 }}
    >
      <div className="size-full bg-muted/40 px-2 py-2 text-xs font-medium tabular-nums whitespace-nowrap text-muted-foreground">
        {children}
      </div>
    </div>
  )
}

/**
 * Columna de un día: su encabezado, una celda por hora y, encima, los bloques
 * de citas en las filas que abarcan. Usa las filas de la cuadrícula
 * (`subgrid`), así que las horas quedan alineadas en toda la semana, y sus
 * propias columnas son los carriles del día.
 */
function DayColumn({
  day,
  blocks,
  lanes,
  busy,
  outOfHours,
  gridColumn,
  bodyRows,
  showOutOfHours,
  onSchedule,
  ...actions
}: AppointmentActions &
  Pick<DayLayout, "blocks" | "lanes" | "busy" | "outOfHours"> & {
    day: AgendaDay
    gridColumn: number
    bodyRows: number
    showOutOfHours: boolean
    onSchedule: (hour: number) => void
  }) {
  const headingId = React.useId()

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={cn(
        "grid grid-rows-subgrid border-r border-border/70 last:border-r-0",
        day.isToday && "bg-primary/5",
      )}
      style={{
        gridRow: `1 / span ${bodyRows + 1}`,
        gridColumn,
        gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))`,
      }}
    >
      <div
        id={headingId}
        aria-current={day.isToday ? "date" : undefined}
        className={cn(
          "col-span-full flex flex-col items-center gap-0.5 border-b border-border/70 px-3 py-2.5",
          day.isToday ? "bg-primary/10" : "bg-muted/40",
        )}
        style={{ gridRow: 1 }}
      >
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
            day.isToday ? "bg-primary text-primary-foreground" : "text-foreground",
          )}
        >
          {dayOfMonth(day.date)}
        </span>
      </div>

      {AGENDA_HOURS.map((hour, row) => (
        <div
          key={hour}
          className={cn(
            "col-span-full p-1.5",
            row < bodyRows - 1 && "border-b border-border/70",
          )}
          style={{ gridRow: row + 2 }}
        >
          {!busy[row] && (
            // Una hora libre agenda ahí. Se esconde por debajo de `lg`: sin
            // hover, una zona invisible que abre un diálogo se toca sin
            // querer, y ahí ya está el botón flotante "Nueva cita".
            <button
              type="button"
              onClick={() => onSchedule(hour)}
              aria-label={`Agendar cita el ${formatLongDate(day.date)} a las ${hourLabel(hour)}`}
              className="flex size-full min-h-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-primary/5 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-lg:hidden"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      ))}

      {blocks.map((block) => (
        <div
          key={block.hour}
          className="flex flex-col gap-1.5 p-1.5"
          style={{
            gridRow: `${block.row + 2} / span ${block.rowSpan}`,
            gridColumn: `${block.lane + 1} / span ${block.laneSpan}`,
          }}
        >
          {block.items.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              className="grow"
              {...actions}
            />
          ))}
        </div>
      ))}

      {showOutOfHours && (
        <div
          role={outOfHours.length > 0 ? "group" : undefined}
          aria-label={outOfHours.length > 0 ? OUT_OF_HOURS_TITLE : undefined}
          className="col-span-full flex flex-col gap-1.5 p-1.5"
          style={{ gridRow: bodyRows + 1 }}
        >
          {outOfHours.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} {...actions} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Mismo horario en teléfono: un solo día (`?day=`) en una columna, con la hora
 * a la izquierda de cada bloque. Los bloques vacíos se quedan a la vista para
 * que se lea de un vistazo qué horas están libres y cuáles siguen ocupadas por
 * una cita que empezó antes.
 */
function DaySchedule({
  day,
  ...actions
}: AppointmentActions & { day: AgendaDay }) {
  const { slots, busy, outOfHours } = layoutDay(day.items)

  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-border/70 rounded-xl",
        day.isToday && "bg-primary/5",
      )}
    >
      {slots.map((slot, row) => (
        <HourBlock
          key={slot.hour}
          label={hourLabel(slot.hour)}
          items={slot.items}
          busy={busy[row]}
          {...actions}
        />
      ))}

      {outOfHours.length > 0 && (
        <HourBlock
          label={OUT_OF_HOURS_LABEL}
          title={OUT_OF_HOURS_TITLE}
          items={outOfHours}
          {...actions}
        />
      )}
    </div>
  )
}

/** Una hora del día en la vista de teléfono. */
function HourBlock({
  label,
  title,
  items,
  busy = false,
  ...actions
}: AppointmentActions & {
  label: string
  title?: string
  items: Appointment[]
  /** Sin citas propias, pero dentro de una que empezó antes. */
  busy?: boolean
}) {
  return (
    <section className="flex items-stretch gap-3 px-3 py-2">
      <h2
        title={title}
        className="w-12 shrink-0 pt-2 text-sm font-medium tabular-nums text-muted-foreground"
      >
        {label}
      </h2>
      <div className="flex min-h-11 flex-1 flex-col justify-center gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground/60">
            {busy ? "Ocupado" : "Libre"}
          </p>
        ) : (
          items.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} {...actions} />
          ))
        )}
      </div>
    </section>
  )
}

/**
 * Tarjeta de una cita: bloque del horario semanal (donde se estira a las horas
 * que dura) o del día en teléfono.
 */
function AppointmentCard({
  appointment: appt,
  className,
  isDeleting,
  onEdit,
  onDelete,
  onStatusChange,
}: AppointmentActions & { appointment: Appointment; className?: string }) {
  // Estatus elegido que se está guardando: la cabecera ya lleva su color
  // mientras tanto y, si falla, vuelve al de la cita.
  const [pendingStatus, setPendingStatus] =
    React.useState<AppointmentStatus | null>(null)
  const shownStatus = pendingStatus ?? appt.status
  const status = STATUS_META[shownStatus]

  function changeStatus(next: AppointmentStatus) {
    if (!onStatusChange || next === appt.status) return
    setPendingStatus(next)
    onStatusChange(appt.id, next)
      // El error se muestra arriba de la agenda (`updateError`).
      .catch(() => {})
      .finally(() => setPendingStatus(null))
  }

  return (
    <article
      className={cn(
        // `shrink-0`: la tarjeta recorta lo que se sale (`overflow-hidden`), así
        // que si la fila la encogiera se perderían el motivo y los botones;
        // mejor que la fila crezca.
        "group flex shrink-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-shadow hover:shadow-sm",
        className,
      )}
    >
      {/* Cabecera con el color del estatus, en una sola fila: el horario va
          completo y el estatus se corta si no cabe (en un carril angosto). Es
          un contenedor para que el selector decida por el ancho de la
          tarjeta, no de la pantalla, si le cabe la flecha. */}
      <div
        className={cn(
          "@container flex items-center justify-between gap-0.5 px-2 py-1 max-sm:gap-1 max-sm:px-3 max-sm:py-2",
          status.className,
        )}
      >
        <span className="shrink-0 text-xs font-semibold tabular-nums whitespace-nowrap max-sm:text-base">
          {formatTimeRange(appt.time, appt.endTime)}
        </span>
        {onStatusChange ? (
          <StatusSelect
            value={shownStatus}
            saving={pendingStatus !== null}
            onChange={changeStatus}
          />
        ) : (
          <span
            title={status.label}
            className="min-w-0 truncate text-[10px] font-medium max-sm:text-xs"
          >
            {status.label}
          </span>
        )}
      </div>

      <div className="flex grow flex-col gap-1 p-2 max-sm:gap-1.5 max-sm:p-3">
        <PatientLink appointment={appt} />

        <p className="text-xs wrap-break-word text-muted-foreground max-sm:text-sm">
          {appt.motivo}
        </p>

        {(onEdit || onDelete) && (
          <div className="mt-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(appt.id)}
                aria-label={`Editar cita de ${appt.patientName || "paciente"}`}
                className={cn(CARD_ACTION, "hover:text-primary")}
              >
                <Pencil className="size-3.5 max-sm:size-4" />
                Editar
              </button>
            )}

            {onDelete && (
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    disabled={isDeleting}
                    aria-label={`Eliminar cita de ${appt.patientName || "paciente"}`}
                    className={cn(CARD_ACTION, "hover:text-rose-600")}
                  >
                    <Trash2 className="size-3.5 max-sm:size-4" />
                    Eliminar
                  </button>
                }
                title="¿Eliminar esta cita?"
                description={`${formatLongDate(appt.date)} · ${formatTimeRange(appt.time, appt.endTime)} h${appt.patientName ? ` — ${appt.patientName}` : ""}. La acción no se puede deshacer.`}
                confirmLabel="Eliminar cita"
                successMessage="La cita se eliminó."
                cancelMessage="Se canceló la eliminación de la cita."
                onConfirm={() => onDelete(appt.id)}
              />
            )}
          </div>
        )}
      </div>
    </article>
  )
}

/**
 * Estatus en la cabecera de la tarjeta (que ya lleva su color): abre un
 * selector para cambiarlo. Es texto sin fondo propio; la flecha solo se
 * muestra si la cabecera tiene espacio para ella junto al nombre completo, y
 * si ni el nombre cabe, se corta con "…" (completo en el `title`).
 */
function StatusSelect({
  value,
  saving,
  onChange,
}: {
  value: AppointmentStatus
  /** Se está guardando `value`: muestra un indicador y bloquea el selector. */
  saving: boolean
  onChange: (status: AppointmentStatus) => void
}) {
  const meta = STATUS_META[value]

  return (
    <Select
      value={value}
      disabled={saving}
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Estatus de la cita: ${meta.label}`}
        title={meta.label}
        className={cn(
          // Sin borde: en una cabecera angosta, cada píxel cuenta para que
          // quepa el nombre completo (el foco se ve con el anillo).
          "h-5 min-w-0 cursor-pointer gap-0.5 rounded-md border-0 bg-transparent px-0.5 py-0 text-[10px] font-medium text-current shadow-none hover:bg-black/5 data-[size=sm]:h-5 [&_svg]:size-3 [&_svg]:text-current",
          // La flecha (último icono) solo si cabe: ~10.5rem de cabecera.
          "[&>svg:last-child]:hidden @min-[10.5rem]:[&>svg:last-child]:block",
          "max-lg:touch-hitbox max-sm:gap-1 max-sm:px-1.5 max-sm:text-xs max-sm:data-[size=sm]:h-8 max-sm:[&_svg]:size-3.5",
        )}
      >
        {saving && <Loader2 className="animate-spin" />}
        <span className="min-w-0 truncate">{meta.label}</span>
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
