import type { Appointment, AppointmentStatus, Treatment } from "@/types/clinic"

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  confirmada: {
    label: "Confirmada",
    className: "border-transparent bg-primary/10 text-primary",
  },
  pendiente: {
    label: "Pendiente",
    className: "border-transparent bg-amber-100 text-amber-700",
  },
  completada: {
    label: "Completada",
    className: "border-transparent bg-emerald-100 text-emerald-700",
  },
  cancelada: {
    label: "Cancelada",
    className: "border-transparent bg-rose-100 text-rose-700",
  },
}

export const APPOINTMENT_STATUSES = Object.keys(
  STATUS_META,
) as AppointmentStatus[]

// ---- Formatting helpers (es-MX) ----

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Importe abreviado para los ejes de las gráficas. Redondear siempre a miles
 * repetía etiquetas con cifras chicas ($1k dos veces), así que solo se abrevia
 * a partir de 1000 y conservando un decimal.
 */
export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) < 1000) return `$${Math.round(value)}`
  const thousands = (value / 1000).toFixed(1).replace(/\.0$/, "")
  return `$${thousands}k`
}

const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const MONTHS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

/** Parse an ISO date string as a local date (avoids TZ shifting). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** `Date` -> `yyyy-mm-dd` using the local calendar day (no TZ shifting). */
export function toISODateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** Today as `yyyy-mm-dd` in the user's timezone. */
export function todayISO(): string {
  return toISODateString(new Date())
}

/**
 * Años cumplidos a partir de una fecha `yyyy-mm-dd`. Compara los componentes
 * como números (sin `new Date(iso)`, que se interpreta como UTC y en México
 * cae un día antes). Un nacido el 29 de febrero cumple el 1 de marzo en años
 * no bisiestos.
 */
export function calculateAge(birthISO: string, today: string = todayISO()): number {
  const [by, bm, bd] = birthISO.split("-").map(Number)
  const [ty, tm, td] = today.split("-").map(Number)
  const hadBirthday = tm > bm || (tm === bm && td >= bd)
  return Math.max(0, ty - by - (hadBirthday ? 0 : 1))
}

/**
 * Valida la fecha de nacimiento de los formularios de paciente. Devuelve el
 * mensaje de error o `null` si es válida. Vacía solo es error si `required`.
 */
export function validateBirthDate(
  value: string,
  today: string = todayISO(),
  required = false,
): string | null {
  if (!value) {
    return required ? "Indica la fecha de nacimiento del paciente." : null
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || toISODateString(parseISO(value)) !== value) {
    return "La fecha de nacimiento no es válida."
  }
  // Las cadenas `yyyy-mm-dd` se ordenan igual que las fechas.
  if (value > today) return "La fecha de nacimiento no puede ser futura."
  return null
}

/** "34 años", "1 año" o "Sin registrar" si no hay fecha de nacimiento. */
export function formatAge(birthISO: string | null, today?: string): string {
  if (!birthISO) return "Sin registrar"
  const age = calculateAge(birthISO, today)
  return `${age} ${age === 1 ? "año" : "años"}`
}

export function formatDayName(iso: string): string {
  const date = parseISO(iso)
  const day = date.toLocaleDateString("es-MX", { weekday: "long" })
  return day.charAt(0).toUpperCase() + day.slice(1)
}

export function formatLongDate(iso: string): string {
  const date = parseISO(iso)
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatShortDate(iso: string): string {
  const date = parseISO(iso)
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

/** "8 Sep 2026" — para cuando la fecha larga no cabe (celdas de tabla). */
export function formatCompactDate(iso: string): string {
  const date = parseISO(iso)
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS_LONG[month - 1]} ${year}`
}

/** `Lun`, `Mar`, ... para el encabezado del calendario. */
export function shortDayName(iso: string): string {
  return DAYS_SHORT[parseISO(iso).getDay()]
}

/** Día del mes (1-31) de una fecha ISO. */
export function dayOfMonth(iso: string): number {
  return parseISO(iso).getDate()
}

// ---- Semanas ISO (lunes a domingo), como las espera `GET /citas?week=` ----

/** Lunes = 0 ... domingo = 6. */
function isoDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

/**
 * Semana ISO y su año-semana. Ojo: a inicios de enero el año-semana puede ser
 * el año calendario anterior (p. ej. 2027-01-01 cae en la semana 53 de 2026),
 * y es ese par (año-semana, semana) el que hay que mandar al backend.
 */
export function getISOWeek(date: Date): { year: number; week: number } {
  // El jueves de la semana determina a qué año-semana pertenece.
  const thursday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - isoDayIndex(date) + 3,
  )
  const year = thursday.getFullYear()
  const jan4 = new Date(year, 0, 4)
  const firstThursday = new Date(
    year,
    0,
    4 - isoDayIndex(jan4) + 3,
  )
  const week =
    1 +
    Math.round(
      (thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    )
  return { year, week }
}

/** Lunes de la semana ISO indicada. */
export function startOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  return new Date(year, 0, 4 - isoDayIndex(jan4) + (week - 1) * 7)
}

// ---- Días de atención ----

/**
 * Días en los que el consultorio no atiende (0 = domingo … 6 = sábado).
 * Es el único lugar donde se define la regla: la agenda oculta esas columnas,
 * el date-picker las bloquea, el formulario de cita las valida y los textos de
 * la interfaz se arman con `closedDaysLabel()`.
 */
export const CLOSED_WEEKDAYS: readonly number[] = [0]

const WEEKDAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
]

/** ¿La fecha cae en un día sin atención? */
export function isClosedDay(iso: string): boolean {
  if (!iso) return false
  return CLOSED_WEEKDAYS.includes(parseISO(iso).getDay())
}

/** Orden de la semana empezando en lunes, para listar días de forma natural. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/**
 * Los días sin atención en plural y en orden: "domingos",
 * "jueves ni domingos", … Devuelve "" si el consultorio abre todos los días.
 */
export function closedDaysLabel(): string {
  const names = WEEK_ORDER.filter((day) => CLOSED_WEEKDAYS.includes(day)).map(
    (day) => `${WEEKDAY_NAMES[day]}s`,
  )
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} ni ${names[names.length - 1]}`
}

/** Nombre del día en minúsculas, para mensajes de validación. */
export function weekdayName(iso: string): string {
  return WEEKDAY_NAMES[parseISO(iso).getDay()]
}

/** Primera fecha con atención a partir de `iso` (incluida). */
export function nextOpenDay(iso: string): string {
  const date = parseISO(iso)
  for (let i = 0; i < 7; i++) {
    const candidate = toISODateString(
      new Date(date.getFullYear(), date.getMonth(), date.getDate() + i),
    )
    if (!isClosedDay(candidate)) return candidate
  }
  return iso
}

/**
 * Día de atención anterior (`delta = -1`) o siguiente (`delta = 1`) a `iso`,
 * sin incluirlo. Puede caer en otra semana.
 */
export function shiftOpenDay(iso: string, delta: 1 | -1): string {
  const date = parseISO(iso)
  for (let i = 1; i <= 7; i++) {
    const candidate = toISODateString(
      new Date(date.getFullYear(), date.getMonth(), date.getDate() + i * delta),
    )
    if (!isClosedDay(candidate)) return candidate
  }
  return iso
}

/** Los días de atención dentro de una lista de fechas ISO. */
export function onlyOpenDays(dates: string[]): string[] {
  return dates.filter((date) => !isClosedDay(date))
}

/** Las 7 fechas (`yyyy-mm-dd`, lunes a domingo) de una semana ISO. */
export function isoWeekDates(year: number, week: number): string[] {
  const monday = startOfISOWeek(year, week)
  return Array.from({ length: 7 }, (_, i) =>
    toISODateString(
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
    ),
  )
}

/**
 * Cuadrícula de un mes para el calendario: semanas completas de lunes a
 * domingo, así que incluye días de los meses vecinos.
 */
export function monthGridDates(year: number, month: number): string[] {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const start = new Date(year, month - 1, 1 - isoDayIndex(first))
  const total =
    Math.round(
      (new Date(year, month - 1, last.getDate() + (6 - isoDayIndex(last))).getTime() -
        start.getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1

  return Array.from({ length: total }, (_, i) =>
    toISODateString(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    ),
  )
}

/** `yyyy-mm` de un año/mes, para comparar contra una fecha ISO. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

/** "1 – 7 de septiembre de 2026" / "29 de junio – 5 de julio de 2026". */
export function formatWeekRange(year: number, week: number): string {
  const dates = isoWeekDates(year, week)
  const from = parseISO(dates[0])
  const to = parseISO(dates[6])
  const sameMonth = from.getMonth() === to.getMonth()
  const sameYear = from.getFullYear() === to.getFullYear()

  const left = sameMonth
    ? `${from.getDate()}`
    : sameYear
      ? `${from.getDate()} de ${MONTHS_LONG[from.getMonth()].toLowerCase()}`
      : `${from.getDate()} de ${MONTHS_LONG[from.getMonth()].toLowerCase()} de ${from.getFullYear()}`

  return `${left} – ${to.getDate()} de ${MONTHS_LONG[to.getMonth()].toLowerCase()} de ${to.getFullYear()}`
}

export function monthLabel(iso: string): string {
  return MONTHS_SHORT[parseISO(iso).getMonth()]
}

export function treatmentsTotal(treatments: Treatment[]): number {
  return treatments.reduce((sum, t) => sum + t.costo, 0)
}

/** Suma de lo abonado ("a cuenta"). */
export function treatmentsPaid(treatments: Treatment[]): number {
  return treatments.reduce((sum, t) => sum + t.aCuenta, 0)
}

/**
 * Saldo pendiente: total de costos menos total de abonos. Se calcula sobre los
 * totales, no renglón por renglón, así que un abono de más en un tratamiento
 * sí compensa lo que se debe en otro (y el saldo puede quedar negativo).
 */
export function treatmentsBalance(treatments: Treatment[]): number {
  return treatmentsTotal(treatments) - treatmentsPaid(treatments)
}

// ---- Aggregations ----

/** Groups appointments by local `yyyy-mm-dd`, sorted by day and hour. */
export function groupByDay(
  appointments: Appointment[],
): { date: string; items: Appointment[] }[] {
  const days = new Map<string, Appointment[]>()
  for (const appt of appointments) {
    const bucket = days.get(appt.date)
    if (bucket) bucket.push(appt)
    else days.set(appt.date, [appt])
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => a.time.localeCompare(b.time)),
    }))
}

/** Serie mensual de ventas para la gráfica, desde `ventasPorMes` del backend. */
export function salesSeries(ventasPorMes: number[]) {
  return MONTHS_SHORT.map((mes, i) => ({ mes, ventas: ventasPorMes[i] ?? 0 }))
}

/** Serie mensual de citas para la gráfica, desde `citasPorMes` del backend. */
export function appointmentsSeries(citasPorMes: number[]) {
  return MONTHS_SHORT.map((mes, i) => ({ mes, citas: citasPorMes[i] ?? 0 }))
}
