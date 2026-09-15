import { toISODateString } from "@/lib/clinic-data"
import type {
  CitaDTO,
  DashboardDTO,
  PacienteDTO,
  TratamientoDTO,
  TratamientoPayload,
  UsuarioDTO,
} from "@/api/types"
import type {
  Appointment,
  AppointmentStatus,
  DashboardMetrics,
  Patient,
  PatientInput,
  Treatment,
  TreatmentInput,
  Usuario,
} from "@/types/clinic"

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "confirmada",
  "pendiente",
  "completada",
  "cancelada",
]

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** `Date` -> `HH:mm` local time. */
export function toLocalTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Date-only columns arrive either as `yyyy-mm-dd` or as a midnight-UTC
 * timestamp; slicing keeps the calendar day intact in both cases.
 */
export function toISODate(value: string | Date): string {
  if (value instanceof Date) return toISODateString(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "" : toISODateString(parsed)
}

/** `yyyy-mm-dd` + `HH:mm` (local) -> ISO timestamp for the API. */
export function toISODateTime(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).toISOString()
}

/**
 * Convierte a número los importes que el backend serializa como string.
 * `?? 0` no basta: solo cubre `null` y dejaba pasar `"1200.00"`, que luego
 * el `PUT /pacientes/:id` rechazaba por esperar `number | null`.
 */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function normalizeStatus(estatus: string): AppointmentStatus {
  const value = estatus?.trim().toLowerCase()
  return (
    APPOINTMENT_STATUSES.find((s) => s === value) ?? "pendiente"
  )
}

/** Siempre 12 posiciones, aunque el backend mande menos. */
function toMonthlyArray(values: number[] | undefined): number[] {
  return Array.from({ length: 12 }, (_, i) => toNumber(values?.[i]))
}

export function toDashboard(dto: DashboardDTO): DashboardMetrics {
  const ventasTotales = toNumber(dto.ventasTotales)
  const dineroPorCobrar = toNumber(dto.dineroPorCobrar)

  return {
    year: toNumber(dto.year),
    ventasTotales,
    consultasTotales: toNumber(dto.consultasTotales),
    pacientesTotales: toNumber(dto.pacientesTotales),
    dineroPorCobrar,
    // El endpoint no manda los abonos, pero `dineroPorCobrar` es
    // Σ(costo − cuenta) y `ventasTotales` es Σ costo, así que la diferencia
    // es exactamente Σ cuenta.
    dineroACuenta: Math.max(0, ventasTotales - dineroPorCobrar),
    ventasPorMes: toMonthlyArray(dto.ventasPorMes),
    citasPorMes: toMonthlyArray(dto.citasPorMes),
  }
}

export function toUsuario(dto: UsuarioDTO): Usuario {
  return {
    correo: dto.correo,
    nombre: dto.nombre,
    tipo: dto.tipo,
    genero: dto.genero ?? null,
    activo: dto.activo,
  }
}

export function toTreatment(dto: TratamientoDTO): Treatment {
  return {
    id: dto.id,
    fecha: toISODate(dto.fecha),
    tratamiento: dto.nombre,
    costo: toNumber(dto.costo),
    aCuenta: toNumber(dto.cuenta),
  }
}

export function toTreatmentPayload(
  treatment: Treatment | TreatmentInput,
): TratamientoPayload {
  return {
    fecha: treatment.fecha,
    nombre: treatment.tratamiento,
    // Se normaliza también de salida: es la frontera donde el backend valida.
    costo: toNumber(treatment.costo),
    cuenta: toNumber(treatment.aCuenta),
  }
}

export function toAppointment(dto: CitaDTO): Appointment {
  const at = new Date(dto.fecha_cita)
  return {
    id: dto.id,
    patientId: dto.id_paciente,
    patientName: dto.paciente?.nombre ?? "",
    date: toISODateString(at),
    time: toLocalTime(at),
    status: normalizeStatus(dto.estatus),
    motivo: dto.motivo,
  }
}

export function toPatient(dto: PacienteDTO): Patient {
  return {
    id: dto.id,
    name: dto.nombre,
    birthDate: dto.fecha_nacimiento ? toISODate(dto.fecha_nacimiento) || null : null,
    gender: dto.sexo ?? "",
    phone: dto.telefono ?? "",
    email: dto.correo ?? "",
    address: dto.direccion ?? "",
    cp: dto.cp ?? "",
    notes: dto.notas ?? "",
    medicoEmail: dto.correo_medico,
    treatments: (dto.tratamientos ?? []).map(toTreatment),
    upcoming: (dto.proximasCitas ?? []).map(toAppointment),
  }
}

export function toPacientePayload(
  input: Partial<PatientInput> & { medicoEmail?: string | null },
): Record<string, string | null> {
  const payload: Record<string, string | null> = {}
  const assign = (key: string, value: string | number | undefined | null) => {
    if (value === undefined || value === null) return
    payload[key] = String(value)
  }

  assign("nombre", input.name)
  assign("sexo", input.gender)
  assign("cp", input.cp)
  assign("direccion", input.address)
  // A diferencia del resto, `null` sí se envía: le indica al backend que
  // borre la fecha. `undefined` (campo omitido) la deja como estaba.
  if (input.birthDate !== undefined) {
    payload.fecha_nacimiento = input.birthDate || null
  }
  assign("correo", input.email)
  assign("telefono", input.phone)
  assign("notas", input.notes)
  assign("correo_medico", input.medicoEmail)

  return payload
}
