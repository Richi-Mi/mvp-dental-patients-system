import {
  APPOINTMENT_STATUSES,
  CLINICAL_HISTORY_QUESTIONS,
  defaultEndTime,
  toISODateString,
} from "@/lib/clinic-data"
import type {
  AjustesDTO,
  CitaDTO,
  DashboardDTO,
  FotoDTO,
  HistorialClinicoDTO,
  HistorialPayload,
  PacienteDTO,
  TratamientoDTO,
  TratamientoPayload,
  UsuarioDTO,
} from "@/api/types"
import type {
  Ajustes,
  Appointment,
  AppointmentStatus,
  ClinicalHistory,
  DashboardMetrics,
  Patient,
  PatientInput,
  PatientPhoto,
  Treatment,
  TreatmentInput,
  Usuario,
} from "@/types/clinic"

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

/**
 * Timestamp del API -> `yyyy-mm-dd` del día local. No sirven `parseISO` (solo
 * lee `yyyy-mm-dd`) ni `toISODate` (recorta el día en UTC, que en México ya
 * es el siguiente por la noche). `""` si no es una fecha válida.
 */
export function toLocalISODate(value: string | null | undefined): string {
  if (!value) return ""
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

/**
 * Un estatus que el cliente no maneja (incluido el antiguo "pendiente") se
 * muestra como "no_asistio".
 */
export function normalizeStatus(estatus: string): AppointmentStatus {
  const value = estatus?.trim().toLowerCase()
  return (
    APPOINTMENT_STATUSES.find((s) => s === value) ?? "no_asistio"
  )
}

/**
 * Conteo por estatus del dashboard con las 4 llaves del cliente. Cada estatus
 * del servidor pasa por `normalizeStatus`, así que "pendiente" o "Confirmada "
 * caen donde se muestran en la agenda.
 */
export function toStatusCounts(
  citasPorEstatus: Record<string, number> | undefined,
): Record<AppointmentStatus, number> {
  const counts = Object.fromEntries(
    APPOINTMENT_STATUSES.map((status) => [status, 0]),
  ) as Record<AppointmentStatus, number>

  for (const [estatus, total] of Object.entries(citasPorEstatus ?? {})) {
    counts[normalizeStatus(estatus)] += toNumber(total)
  }
  return counts
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
    month: dto.month == null ? null : toNumber(dto.month),
    ventasTotales,
    consultasTotales: toNumber(dto.consultasTotales),
    pacientesNuevos: toNumber(dto.pacientesNuevos),
    pacientesTotales: toNumber(dto.pacientesTotales),
    dineroPorCobrar,
    // El endpoint no manda los abonos, pero `dineroPorCobrar` es
    // Σ(costo − cuenta) y `ventasTotales` es Σ costo, así que la diferencia
    // es exactamente Σ cuenta.
    dineroACuenta: Math.max(0, ventasTotales - dineroPorCobrar),
    ventasPorMes: toMonthlyArray(dto.ventasPorMes),
    citasPorMes: toMonthlyArray(dto.citasPorMes),
    citasPorEstatus: toStatusCounts(dto.citasPorEstatus),
  }
}

export function toAjustes(dto: AjustesDTO): Ajustes {
  return { autocompletarCitas: dto.autocompletarCitas === true }
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

/**
 * Nombre con el que el backend guarda un tratamiento capturado sin nombre
 * (solo con costo o a cuenta). En la interfaz se muestra vacío.
 */
const TRATAMIENTO_SIN_MOTIVO = "SIN_MOTIVO"

export function toTreatment(dto: TratamientoDTO): Treatment {
  return {
    id: dto.id,
    fecha: toISODate(dto.fecha),
    tratamiento: dto.nombre === TRATAMIENTO_SIN_MOTIVO ? "" : dto.nombre,
    costo: toNumber(dto.costo),
    aCuenta: toNumber(dto.cuenta),
  }
}

export function toTreatmentPayload(
  treatment: Treatment | TreatmentInput,
): TratamientoPayload {
  return {
    fecha: treatment.fecha,
    // Vacío: el backend lo guarda como `TRATAMIENTO_SIN_MOTIVO`.
    nombre: treatment.tratamiento,
    // Se normaliza también de salida: es la frontera donde el backend valida.
    costo: toNumber(treatment.costo),
    cuenta: toNumber(treatment.aCuenta),
  }
}

export function toAppointment(dto: CitaDTO): Appointment {
  const at = new Date(dto.fecha_cita)
  const time = toLocalTime(at)
  return {
    id: dto.id,
    patientId: dto.id_paciente,
    patientName: dto.paciente?.nombre ?? "",
    date: toISODateString(at),
    time,
    // Ya es hora local (`HH:MM`); el respaldo cubre un backend sin la columna.
    endTime: dto.horaFin?.slice(0, 5) || defaultEndTime(time),
    status: normalizeStatus(dto.estatus),
    motivo: dto.motivo,
  }
}

export function toClinicalHistory(dto: HistorialClinicoDTO): ClinicalHistory {
  const answers = {} as ClinicalHistory
  for (const { key } of CLINICAL_HISTORY_QUESTIONS) {
    answers[key] = dto.historial?.[key] ?? ""
  }
  return answers
}

/**
 * Solo se envían las preguntas presentes en `answers`: al actualizar, una
 * omitida conserva su respuesta (así la de embarazo, que se oculta si el
 * paciente no es de sexo femenino, no se borra). En blanco se envía `null`.
 */
export function toHistorialPayload(
  patientId: number,
  answers: Partial<ClinicalHistory>,
): HistorialPayload {
  const historial: HistorialPayload["historial"] = {}
  for (const { key } of CLINICAL_HISTORY_QUESTIONS) {
    const value = answers[key]
    if (value !== undefined) historial[key] = value.trim() || null
  }
  return { id_paciente: patientId, historial }
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
    createdAt: toLocalISODate(dto.fecha_creacion),
    treatments: (dto.tratamientos ?? []).map(toTreatment),
    upcoming: (dto.proximasCitas ?? []).map(toAppointment),
    clinicalHistory: dto.historialClinico
      ? toClinicalHistory(dto.historialClinico)
      : null,
  }
}

export function toPatientPhoto(dto: FotoDTO): PatientPhoto {
  return {
    name: dto.img_name,
    patientId: dto.id_paciente,
    uploadedAt: toLocalISODate(dto.fecha_subida),
    url: dto.url,
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
