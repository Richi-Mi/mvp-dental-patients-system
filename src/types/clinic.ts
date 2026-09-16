/** UI domain model. Mapped from the server DTOs in `@/lib/mappers`. */

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
  patientId: number
  patientName: string
  date: string // ISO yyyy-mm-dd (local)
  time: string // HH:mm (local)
  status: AppointmentStatus
  motivo: string
}

/** Clave con la que el backend guarda cada pregunta del historial clínico. */
export type ClinicalQuestionKey = `pregunta_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`

/** Respuestas del historial clínico; `""` = pregunta sin responder. */
export type ClinicalHistory = Record<ClinicalQuestionKey, string>

export type Patient = {
  id: number
  name: string
  /** `yyyy-mm-dd`; `null` si no se capturó (pacientes anteriores). */
  birthDate: string | null
  gender: string
  phone: string
  email: string
  address: string
  cp: string
  notes: string
  medicoEmail: string | null
  /** Only populated by `GET /pacientes/:id`. */
  treatments: Treatment[]
  /** Only populated by `GET /pacientes/:id`. */
  upcoming: Appointment[]
  /**
   * Only populated by `GET /pacientes/:id`; `null` = el paciente no tiene
   * historial clínico.
   */
  clinicalHistory: ClinicalHistory | null
}

export type PatientInput = {
  name: string
  birthDate: string | null
  gender: string
  phone: string
  email: string
  address: string
  cp: string
  notes: string
}

export type AppointmentInput = {
  patientId: number
  date: string // yyyy-mm-dd
  time: string // HH:mm
  status: AppointmentStatus
  motivo: string
}

export type TreatmentInput = Omit<Treatment, "id">

export type DashboardMetrics = {
  year: number
  ventasTotales: number
  consultasTotales: number
  pacientesTotales: number
  dineroPorCobrar: number
  /** Derivado en el cliente: el endpoint no lo devuelve (ver `toDashboard`). */
  dineroACuenta: number
  /** 12 posiciones, índice 0 = enero. */
  ventasPorMes: number[]
  /** 12 posiciones, índice 0 = enero. */
  citasPorMes: number[]
}

export type Usuario = {
  correo: string
  nombre: string
  tipo: "medico" | "asistente"
  /** `null` si no se ha registrado (usuarios anteriores). */
  genero: "femenino" | "masculino" | null
  activo: boolean
}
