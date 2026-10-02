import type {
  Appointment,
  AppointmentStatus,
  ClinicalQuestionKey,
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
  completada: {
    label: "Completada",
    className: "border-transparent bg-emerald-100 text-emerald-700",
  },
  no_asistio: {
    label: "No asistió",
    className: "border-transparent bg-slate-200 text-slate-700",
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

/** Fracción como porcentaje entero: `0.456` -> `"46%"`. */
export function formatPercent(fraction: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(fraction)
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

// ---- Horario de atención ----

/**
 * Primera y última hora con atención (24 h). Es el único lugar donde se define
 * el rango: de aquí salen las filas del horario semanal de la agenda y el
 * rango que acepta el `TimePicker`. La última hora es un bloque completo, así
 * que una cita de las 20:45 sigue estando en horario.
 */
export const OPENING_HOUR = 10
export const CLOSING_HOUR = 20

/** Las horas del horario, una por fila de la agenda: `[10, 11, … 20]`. */
export const AGENDA_HOURS: readonly number[] = Array.from(
  { length: CLOSING_HOUR - OPENING_HOUR + 1 },
  (_, i) => OPENING_HOUR + i,
)

/** `10` -> `"10:00"`. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`
}

/** La hora (0–23) de un `HH:mm`, o `null` si no se puede leer. */
export function hourOf(time: string): number | null {
  const hour = Number.parseInt(time.slice(0, 2), 10)
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null
}

// ---- Duración de las citas ----

/** Minutos que dura una cita nueva mientras no se elija otra hora de fin. */
export const DEFAULT_APPOINTMENT_MINUTES = 60

/**
 * Última hora (0–23) que acepta la hora de fin: una cita del último bloque
 * (hasta las 20:59) ya termina dentro de la hora siguiente.
 */
export const LAST_END_HOUR = CLOSING_HOUR + 1

/** `HH:mm` -> minutos desde la medianoche, o `null` si no se puede leer. */
export function timeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null
}

/** Minutos desde la medianoche -> `HH:mm`, sin salirse del día (00:00–23:59). */
export function minutesToTime(minutes: number): string {
  const clamped = Math.min(Math.max(Math.round(minutes), 0), 24 * 60 - 1)
  const hours = String(Math.floor(clamped / 60)).padStart(2, "0")
  return `${hours}:${String(clamped % 60).padStart(2, "0")}`
}

/** Hora de fin por defecto de una cita que empieza a `time`. */
export function defaultEndTime(time: string): string {
  const start = timeToMinutes(time) ?? OPENING_HOUR * 60
  return minutesToTime(start + DEFAULT_APPOINTMENT_MINUTES)
}

/**
 * Hora de fin cuando la cita pasa de empezar a `start` a empezar a
 * `nextStart`: conserva su duración (la de por defecto si no era válida), sin
 * pasar de la última hora de fin (`LAST_END_HOUR`).
 */
export function shiftEndTime(start: string, end: string, nextStart: string): string {
  const from = timeToMinutes(start)
  const to = timeToMinutes(end)
  const duration =
    from !== null && to !== null && to > from ? to - from : DEFAULT_APPOINTMENT_MINUTES
  const next = timeToMinutes(nextStart) ?? OPENING_HOUR * 60
  return minutesToTime(Math.min(next + duration, LAST_END_HOUR * 60 + 59))
}

/** `"10:00 - 11:00"`. */
export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`
}

export type HourSlot = {
  hour: number
  /** Las citas que empiezan dentro de esa hora, ordenadas por minuto. */
  items: Appointment[]
}

/**
 * Reparte las citas de un día en los bloques de una hora del horario
 * (`AGENDA_HOURS`), en ese mismo orden. Un bloque puede quedarse vacío o
 * acumular varias citas (10:15 y 10:45 caen las dos en el de las 10:00).
 *
 * Las citas fuera del horario —registradas antes de fijar el rango, o por un
 * `time` que no se puede leer— se devuelven aparte en vez de forzarlas a una
 * fila que no les toca, igual que `outOfWeek` hace con los días.
 */
export function groupByHour(appointments: Appointment[]): {
  slots: HourSlot[]
  outOfHours: Appointment[]
} {
  const slots: HourSlot[] = AGENDA_HOURS.map((hour) => ({ hour, items: [] }))
  const byHour = new Map(slots.map((slot) => [slot.hour, slot.items]))
  const outOfHours: Appointment[] = []

  for (const appt of appointments) {
    const hour = hourOf(appt.time)
    const bucket = hour === null ? undefined : byHour.get(hour)
    if (bucket) bucket.push(appt)
    else outOfHours.push(appt)
  }

  for (const slot of slots) slot.items.sort((a, b) => a.time.localeCompare(b.time))
  outOfHours.sort((a, b) => a.time.localeCompare(b.time))
  return { slots, outOfHours }
}

/**
 * Un bloque del horario semanal. `hour` e `items` son los de su hora, más las
 * citas de las horas siguientes que se le unen por empezar justo cuando
 * termina (ver `layoutDay`).
 */
export type ScheduleBlock = HourSlot & {
  /** Fila del horario en que empieza (0 = la de `OPENING_HOUR`). */
  row: number
  /** Filas que ocupa: hasta la hora en que termina la última de sus citas. */
  rowSpan: number
  /** Carril dentro del día (0 = el primero), para las citas que se enciman. */
  lane: number
  /** Carriles que abarca: se extiende sobre los vecinos que tenga libres. */
  laneSpan: number
}

export type DayLayout = {
  /** Todas las horas del horario, como en `groupByHour`. */
  slots: HourSlot[]
  /** Las horas que tienen citas, ya acomodadas en la cuadrícula. */
  blocks: ScheduleBlock[]
  /** Carriles del día: más de uno solo si hay citas que se enciman. */
  lanes: number
  /** Una posición por hora de `AGENDA_HOURS`: `true` si alguna cita la ocupa. */
  busy: boolean[]
  outOfHours: Appointment[]
}

/**
 * Filas que ocupa una cita que empieza en la fila `row`: todas las horas que
 * toca hasta su fin, redondeando a horas completas (de 10:30 a 11:15 ocupa la
 * de las 10 y la de las 11). Mínimo una, y la última fila del horario es el
 * tope. Una hora de fin ilegible o que no es posterior al inicio cuenta como
 * una sola fila.
 */
function rowSpanOf(appointment: Appointment, row: number): number {
  const start = timeToMinutes(appointment.time)
  const end = timeToMinutes(appointment.endTime)
  const endRow =
    start !== null && end !== null && end > start
      ? Math.ceil(end / 60) - OPENING_HOUR
      : row + 1
  return Math.min(Math.max(endRow, row + 1), AGENDA_HOURS.length) - row
}

/**
 * Minuto (desde la medianoche) en que termina una cita que empieza en la hora
 * `hour`. Una hora de fin ilegible o que no es posterior al inicio cuenta hasta
 * el final de esa hora, igual que `rowSpanOf` la cuenta como una sola fila.
 */
function endMinuteOf(appointment: Appointment, hour: number): number {
  const start = timeToMinutes(appointment.time)
  const end = timeToMinutes(appointment.endTime)
  return start !== null && end !== null && end > start ? end : (hour + 1) * 60
}

/**
 * Acomoda un día en el horario semanal a partir de `groupByHour`: cada hora
 * con citas es un bloque que ocupa de su fila hasta la hora en que termina la
 * última de ellas, así que su alto es proporcional a la duración.
 *
 * Si un bloque empieza mientras otro sigue ocupado (una cita de 10:00 a 12:00
 * y otra a las 11:00), van en carriles distintos, uno junto al otro; cada
 * bloque se extiende sobre los carriles vecinos que tenga libres en sus horas.
 * El traslape se mide en minutos: si dos bloques comparten una fila pero no se
 * enciman (uno termina a las 11:30 y el otro empieza a las 11:30), el segundo
 * se une al primero y sus citas quedan apiladas en el mismo carril.
 */
export function layoutDay(appointments: Appointment[]): DayLayout {
  const { slots, outOfHours } = groupByHour(appointments)
  const blocks: ScheduleBlock[] = []
  // Último bloque de cada carril y el minuto en que termina su última cita.
  const laneTails: { block: ScheduleBlock; end: number }[] = []

  slots.forEach((slot, row) => {
    if (slot.items.length === 0) return
    const rowSpan = Math.max(...slot.items.map((appt) => rowSpanOf(appt, row)))
    // Vienen ordenadas por minuto: la primera es la que empieza antes.
    const start = timeToMinutes(slot.items[0].time) ?? slot.hour * 60
    const end = Math.max(...slot.items.map((appt) => endMinuteOf(appt, slot.hour)))

    // Primer carril libre en esta fila o cuya última cita ya terminó.
    const lane = laneTails.findIndex(
      (tail) => tail.block.row + tail.block.rowSpan <= row || tail.end <= start,
    )
    const tail = laneTails[lane]
    if (tail && tail.block.row + tail.block.rowSpan > row) {
      // Comparten fila sin encimarse: se apilan en el bloque que ya estaba.
      tail.block.items.push(...slot.items)
      tail.block.rowSpan = Math.max(tail.block.rowSpan, row + rowSpan - tail.block.row)
      tail.end = Math.max(tail.end, end)
      return
    }

    const index = lane === -1 ? laneTails.length : lane
    // Copia de las citas: si otro bloque se le une, `slots` no cambia.
    const block = { ...slot, items: [...slot.items], row, rowSpan, lane: index, laneSpan: 1 }
    blocks.push(block)
    laneTails[index] = { block, end }
  })

  const lanes = Math.max(laneTails.length, 1)
  const overlap = (a: ScheduleBlock, b: ScheduleBlock) =>
    a.row < b.row + b.rowSpan && b.row < a.row + a.rowSpan

  for (const block of blocks) {
    let next = block.lane + 1
    while (
      next < lanes &&
      !blocks.some((other) => other.lane === next && overlap(block, other))
    ) {
      next++
    }
    block.laneSpan = next - block.lane
  }

  const busy = AGENDA_HOURS.map((_, row) =>
    blocks.some((block) => row >= block.row && row < block.row + block.rowSpan),
  )

  return { slots, blocks, lanes, busy, outOfHours }
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

// ---- Historial clínico ----

export type ClinicalQuestion = {
  key: ClinicalQuestionKey
  label: string
  /** Solo aplica a pacientes de sexo femenino. */
  onlyFemale?: boolean
}

/** Cuestionario del historial clínico, en el orden en que se muestra. */
export const CLINICAL_HISTORY_QUESTIONS: readonly ClinicalQuestion[] = [
  {
    key: "pregunta_1",
    label: "¿Ha habido un cambio en su salud en los últimos 2 años?",
  },
  { key: "pregunta_2", label: "¿Se encuentra bajo tratamiento médico?" },
  {
    key: "pregunta_3",
    label: "¿Es alérgico a algún medicamento, sustancia o alimento?",
  },
  {
    key: "pregunta_4",
    label: "¿Se ha sometido a una intervención quirúrgica de importancia?",
  },
  { key: "pregunta_5", label: "¿Le han efectuado transfusiones sanguíneas?" },
  { key: "pregunta_6", label: "¿Está tomando alguna droga o medicina?" },
  { key: "pregunta_7", label: "¿Padece o ha padecido hepatitis?" },
  {
    key: "pregunta_8",
    label:
      "¿Ha tenido hemorragias excesivas o anormales después de extracciones, cirugía o traumatismo?",
  },
  {
    key: "pregunta_9",
    label:
      "¿Padece alguna enfermedad o trastorno no mencionado que crea importante dar a conocer?",
  },
  {
    key: "pregunta_10",
    label: "Mujeres: ¿Está usted embarazada?",
    onlyFemale: true,
  },
]

/**
 * Preguntas que aplican al paciente: la de embarazo solo se muestra si su sexo
 * es femenino (sin distinguir mayúsculas). El backend no lo valida.
 */
export function clinicalQuestionsFor(gender: string): ClinicalQuestion[] {
  const isFemale = gender.trim().toLowerCase() === "femenino"
  return CLINICAL_HISTORY_QUESTIONS.filter((q) => !q.onlyFemale || isFemale)
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

/**
 * Rebanadas del pastel de estatus del dashboard, en orden fijo para que cada
 * una conserve su color aunque otra quede en cero. "No asistió" y "Cancelada"
 * van juntas.
 */
export const STATUS_SLICES = [
  "completada",
  "confirmada",
  "no_asistio_cancelada",
] as const

export type StatusSlice = (typeof STATUS_SLICES)[number]

/** `fill` apunta al color que define el `ChartConfig` de cada rebanada. */
export function appointmentStatusSeries(
  counts: Record<AppointmentStatus, number>,
) {
  const citas: Record<StatusSlice, number> = {
    completada: counts.completada,
    confirmada: counts.confirmada,
    no_asistio_cancelada: counts.no_asistio + counts.cancelada,
  }
  return STATUS_SLICES.map((estatus) => ({
    estatus,
    citas: citas[estatus],
    fill: `var(--color-${estatus})`,
  }))
}

/** Primer año con datos del consultorio: el dashboard ofrece de aquí al año en curso. */
export const DASHBOARD_FIRST_YEAR = 2026

/** Valor de `?month=` para ver todo el año en el dashboard. */
export const DASHBOARD_WHOLE_YEAR = "todo"

/** Periodo del dashboard: `month` de 1 a 12, o `null` para todo el año. */
export type DashboardPeriod = { year: number; month: number | null }

/** Meses para un selector: `{ value: 1, label: "Enero" }` … */
export const MONTH_OPTIONS = MONTHS_LONG.map((label, i) => ({ value: i + 1, label }))

/**
 * Años del selector del dashboard, del más reciente al más antiguo: de
 * `DASHBOARD_FIRST_YEAR` al año en curso, así que cada enero aparece el año
 * nuevo sin tocar código.
 */
export function dashboardYears(today: Date = new Date()): number[] {
  const last = Math.max(today.getFullYear(), DASHBOARD_FIRST_YEAR)
  return Array.from({ length: last - DASHBOARD_FIRST_YEAR + 1 }, (_, i) => last - i)
}

/**
 * Periodo del dashboard desde la URL (`?year=&month=`). Sin parámetros, o con
 * un año fuera de `dashboardYears` o un mes inválido, se usa el mes en curso
 * del año actual. `?month=todo` = todo el año.
 */
export function readDashboardPeriod(
  params: URLSearchParams,
  today: Date = new Date(),
): DashboardPeriod {
  const years = dashboardYears(today)
  const year = Number(params.get("year"))
  const rawMonth = params.get("month")
  const month = Number(rawMonth)

  return {
    year: years.includes(year) ? year : years[0],
    month:
      rawMonth === DASHBOARD_WHOLE_YEAR
        ? null
        : Number.isInteger(month) && month >= 1 && month <= 12
          ? month
          : today.getMonth() + 1,
  }
}

/** "septiembre de 2026", o "2026" si es todo el año. */
export function formatDashboardPeriod({ year, month }: DashboardPeriod): string {
  return month === null
    ? String(year)
    : `${MONTHS_LONG[month - 1].toLowerCase()} de ${year}`
}
