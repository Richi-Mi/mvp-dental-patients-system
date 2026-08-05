export type AppointmentStatus =
  | "confirmada"
  | "pendiente"
  | "completada"
  | "cancelada"

export type Treatment = {
  id: string
  fecha: string // ISO yyyy-mm-dd
  tratamiento: string
  costo: number
  aCuenta: number
}

export type Appointment = {
  id: string
  patientId: string
  date: string // ISO yyyy-mm-dd
  time: string // HH:mm
  status: AppointmentStatus
  motivo: string
}

export type Patient = {
  id: string
  name: string
  age: number
  gender: "Femenino" | "Masculino"
  phone: string
  email: string
  address: string
  notes: string
  treatments: Treatment[]
}

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  confirmada: {
    label: "Confirmada",
    className:
      "border-transparent bg-primary/10 text-primary",
  },
  pendiente: {
    label: "Pendiente",
    className:
      "border-transparent bg-amber-100 text-amber-700",
  },
  completada: {
    label: "Completada",
    className:
      "border-transparent bg-emerald-100 text-emerald-700",
  },
  cancelada: {
    label: "Cancelada",
    className:
      "border-transparent bg-rose-100 text-rose-700",
  },
}

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

/** Parse an ISO date string as a local date (avoids TZ shifting). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
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

export function monthKey(iso: string): string {
  const date = parseISO(iso)
  return `${date.getFullYear()}-${date.getMonth()}`
}

export function monthLabel(iso: string): string {
  const date = parseISO(iso)
  return MONTHS_SHORT[date.getMonth()]
}

export function treatmentSaldo(t: Treatment): number {
  return Math.max(0, t.costo - t.aCuenta)
}

// ---- Seed data ----

export const initialPatients: Patient[] = [
  {
    id: "p1",
    name: "María González Ruiz",
    age: 34,
    gender: "Femenino",
    phone: "+52 55 1234 5678",
    email: "maria.gonzalez@email.com",
    address: "Av. Reforma 210, CDMX",
    notes: "Alergia a la penicilina. Sensibilidad dental moderada.",
    treatments: [
      { id: "t1", fecha: "2026-03-12", tratamiento: "Limpieza dental", costo: 800, aCuenta: 800 },
      { id: "t2", fecha: "2026-05-20", tratamiento: "Resina (2 piezas)", costo: 2400, aCuenta: 1500 },
      { id: "t3", fecha: "2026-07-02", tratamiento: "Blanqueamiento", costo: 3500, aCuenta: 2000 },
    ],
  },
  {
    id: "p2",
    name: "Carlos Ramírez Soto",
    age: 45,
    gender: "Masculino",
    phone: "+52 55 2345 6789",
    email: "carlos.ramirez@email.com",
    address: "Calle Pino 45, Guadalajara",
    notes: "Bruxismo. Uso de guarda nocturna.",
    treatments: [
      { id: "t4", fecha: "2026-02-08", tratamiento: "Extracción muela", costo: 1800, aCuenta: 1800 },
      { id: "t5", fecha: "2026-06-15", tratamiento: "Corona de porcelana", costo: 6500, aCuenta: 3000 },
    ],
  },
  {
    id: "p3",
    name: "Ana Lucía Torres",
    age: 28,
    gender: "Femenino",
    phone: "+52 55 3456 7890",
    email: "ana.torres@email.com",
    address: "Blvd. Sur 900, Monterrey",
    notes: "Ortodoncia en curso. Ajuste mensual.",
    treatments: [
      { id: "t6", fecha: "2026-01-18", tratamiento: "Ortodoncia (colocación)", costo: 12000, aCuenta: 6000 },
      { id: "t7", fecha: "2026-04-18", tratamiento: "Ajuste ortodoncia", costo: 700, aCuenta: 700 },
      { id: "t8", fecha: "2026-07-18", tratamiento: "Ajuste ortodoncia", costo: 700, aCuenta: 0 },
    ],
  },
  {
    id: "p4",
    name: "Jorge Mendoza Vera",
    age: 52,
    gender: "Masculino",
    phone: "+52 55 4567 8901",
    email: "jorge.mendoza@email.com",
    address: "Av. Juárez 12, Puebla",
    notes: "Hipertensión controlada.",
    treatments: [
      { id: "t9", fecha: "2026-03-30", tratamiento: "Endodoncia", costo: 4500, aCuenta: 4500 },
      { id: "t10", fecha: "2026-06-28", tratamiento: "Limpieza dental", costo: 800, aCuenta: 800 },
    ],
  },
  {
    id: "p5",
    name: "Sofía Herrera Lara",
    age: 19,
    gender: "Femenino",
    phone: "+52 55 5678 9012",
    email: "sofia.herrera@email.com",
    address: "Calle Roble 88, Querétaro",
    notes: "Primera visita. Sin antecedentes relevantes.",
    treatments: [
      { id: "t11", fecha: "2026-05-05", tratamiento: "Revisión general", costo: 500, aCuenta: 500 },
    ],
  },
  {
    id: "p6",
    name: "Ricardo Peña Flores",
    age: 41,
    gender: "Masculino",
    phone: "+52 55 6789 0123",
    email: "ricardo.pena@email.com",
    address: "Av. Central 300, León",
    notes: "Implante en seguimiento.",
    treatments: [
      { id: "t12", fecha: "2026-02-22", tratamiento: "Implante dental", costo: 15000, aCuenta: 8000 },
      { id: "t13", fecha: "2026-04-10", tratamiento: "Control implante", costo: 600, aCuenta: 600 },
    ],
  },
]

export const initialAppointments: Appointment[] = [
  { id: "a1", patientId: "p1", date: "2026-08-05", time: "09:00", status: "confirmada", motivo: "Continuación resina" },
  { id: "a2", patientId: "p3", date: "2026-08-05", time: "10:30", status: "confirmada", motivo: "Ajuste ortodoncia" },
  { id: "a3", patientId: "p2", date: "2026-08-06", time: "12:00", status: "pendiente", motivo: "Prueba de corona" },
  { id: "a4", patientId: "p5", date: "2026-08-07", time: "16:00", status: "confirmada", motivo: "Limpieza dental" },
  { id: "a5", patientId: "p4", date: "2026-08-10", time: "11:00", status: "pendiente", motivo: "Revisión endodoncia" },
  { id: "a6", patientId: "p6", date: "2026-08-12", time: "13:30", status: "confirmada", motivo: "Control de implante" },
  { id: "a7", patientId: "p1", date: "2026-08-14", time: "09:30", status: "pendiente", motivo: "Blanqueamiento" },
  { id: "a8", patientId: "p3", date: "2026-07-18", time: "10:00", status: "completada", motivo: "Ajuste ortodoncia" },
]

/** Monthly aggregation of sales (treatment cost) for the current year. */
export function salesByMonth(patients: Patient[]) {
  const totals = new Array(12).fill(0)
  for (const p of patients) {
    for (const t of p.treatments) {
      const d = parseISO(t.fecha)
      totals[d.getMonth()] += t.costo
    }
  }
  return totals.map((ventas, i) => ({ mes: MONTHS_SHORT[i], ventas }))
}

/** Monthly aggregation of appointment counts. */
export function appointmentsByMonth(appointments: Appointment[]) {
  const totals = new Array(12).fill(0)
  for (const a of appointments) {
    const d = parseISO(a.date)
    totals[d.getMonth()] += 1
  }
  return totals.map((citas, i) => ({ mes: MONTHS_SHORT[i], citas }))
}
