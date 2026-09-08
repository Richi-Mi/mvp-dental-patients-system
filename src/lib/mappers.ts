import { toISODateString } from "@/lib/clinic-data"
import type {
  CitaDTO,
  PacienteDTO,
  TratamientoDTO,
  TratamientoPayload,
  UsuarioDTO,
} from "@/api/types"
import type {
  Appointment,
  AppointmentStatus,
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

export function normalizeStatus(estatus: string): AppointmentStatus {
  const value = estatus?.trim().toLowerCase()
  return (
    APPOINTMENT_STATUSES.find((s) => s === value) ?? "pendiente"
  )
}

export function toUsuario(dto: UsuarioDTO): Usuario {
  return {
    correo: dto.correo,
    nombre: dto.nombre,
    tipo: dto.tipo,
    activo: dto.activo,
  }
}

export function toTreatment(dto: TratamientoDTO): Treatment {
  return {
    id: dto.id,
    fecha: toISODate(dto.fecha),
    tratamiento: dto.nombre,
    costo: dto.costo ?? 0,
    aCuenta: dto.cuenta ?? 0,
  }
}

export function toTreatmentPayload(
  treatment: Treatment | TreatmentInput,
): TratamientoPayload {
  return {
    fecha: treatment.fecha,
    nombre: treatment.tratamiento,
    costo: treatment.costo,
    cuenta: treatment.aCuenta,
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
    age: Number(dto.edad) || 0,
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
): Record<string, string> {
  const payload: Record<string, string> = {}
  const assign = (key: string, value: string | number | undefined | null) => {
    if (value === undefined || value === null) return
    payload[key] = String(value)
  }

  assign("nombre", input.name)
  assign("sexo", input.gender)
  assign("cp", input.cp)
  assign("direccion", input.address)
  assign("edad", input.age)
  assign("correo", input.email)
  assign("telefono", input.phone)
  assign("notas", input.notes)
  assign("correo_medico", input.medicoEmail)

  return payload
}
