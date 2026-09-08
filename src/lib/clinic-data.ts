import type {
  Appointment,
  AppointmentStatus,
  Patient,
  Treatment,
} from "@/types/clinic"

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

/** Las 7 fechas (`yyyy-mm-dd`, lunes a domingo) de una semana ISO. */
export function isoWeekDates(year: number, week: number): string[] {
  const monday = startOfISOWeek(year, week)
  return Array.from({ length: 7 }, (_, i) =>
    toISODateString(
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
    ),
  )
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

export function treatmentSaldo(t: Treatment): number {
  return Math.max(0, t.costo - t.aCuenta)
}

export function treatmentsTotal(treatments: Treatment[]): number {
  return treatments.reduce((sum, t) => sum + t.costo, 0)
}

export function treatmentsSaldo(treatments: Treatment[]): number {
  return treatments.reduce((sum, t) => sum + treatmentSaldo(t), 0)
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

/** Monthly aggregation of sales (treatment cost). */
export function salesByMonth(patients: Patient[]) {
  const totals = new Array(12).fill(0)
  for (const p of patients) {
    for (const t of p.treatments) {
      if (!t.fecha) continue
      totals[parseISO(t.fecha).getMonth()] += t.costo
    }
  }
  return totals.map((ventas, i) => ({ mes: MONTHS_SHORT[i], ventas }))
}

/** Monthly aggregation of appointment counts. */
export function appointmentsByMonth(appointments: Appointment[]) {
  const totals = new Array(12).fill(0)
  for (const a of appointments) {
    if (!a.date) continue
    totals[parseISO(a.date).getMonth()] += 1
  }
  return totals.map((citas, i) => ({ mes: MONTHS_SHORT[i], citas }))
}
