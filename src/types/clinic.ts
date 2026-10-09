/** UI domain model. Mapped from the server DTOs in `@/lib/mappers`. */

/**
 * El backend guarda `estatus` como texto libre (`varchar(50)`), así que esta
 * lista es la del cliente: lo que se puede elegir y mostrar (ver `STATUS_META`
 * en `lib/clinic-data.ts`). Un valor desconocido, como el antiguo
 * "pendiente", cae en "no_asistio" (`normalizeStatus`).
 */
export type AppointmentStatus =
  | "confirmada"
  | "completada"
  | "no_asistio"
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
  endTime: string // HH:mm (local), posterior a `time`
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
  /** `yyyy-mm-dd` (día local) en que se registró el paciente. */
  createdAt: string
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

/** Foto de un paciente. La imagen se descarga aparte (`usePhotoFile`). */
export type PatientPhoto = {
  /** Nombre del archivo en el servidor; identifica la foto. */
  name: string
  patientId: number
  /** `yyyy-mm-dd` (día local) en que se subió; `""` si no llegó. */
  uploadedAt: string
  /** Ruta del API que devuelve la imagen (requiere el header `token`). */
  url: string
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
  endTime: string // HH:mm
  status: AppointmentStatus
  motivo: string
}

export type TreatmentInput = Omit<Treatment, "id">

export type DashboardMetrics = {
  year: number
  /** 1 = enero … 12 = diciembre; `null` = todo el año. */
  month: number | null
  ventasTotales: number
  consultasTotales: number
  pacientesNuevos: number
  /** Histórico de pacientes activos: no se acota al periodo. */
  pacientesTotales: number
  dineroPorCobrar: number
  /** Derivado en el cliente: el endpoint no lo devuelve (ver `toDashboard`). */
  dineroACuenta: number
  /** 12 posiciones, índice 0 = enero. */
  ventasPorMes: number[]
  /** 12 posiciones, índice 0 = enero. */
  citasPorMes: number[]
  /**
   * Citas del periodo por estatus del cliente (los desconocidos, como el
   * antiguo "pendiente", cuentan como `no_asistio`). Suma `consultasTotales`.
   */
  citasPorEstatus: Record<AppointmentStatus, number>
}

/**
 * Horario de atención: primera y última hora (0–23) de la agenda. La última
 * es un bloque completo (con cierre a las 20, una cita puede empezar a las
 * 20:55).
 */
export type WorkingHours = {
  opening: number
  closing: number
}

/**
 * Ajustes del usuario (médico o asistente) guardados en el servidor
 * (`/ajustes`): los mismos en todos sus dispositivos.
 */
export type Ajustes = {
  /**
   * Las citas confirmadas pasan solas a completadas un día después. Solo lo
   * cambia un médico: las citas son suyas.
   */
  autocompletarCitas: boolean
  workingHours: WorkingHours
  /** Porcentaje del tamaño de letra del navegador (ver `lib/font-size.ts`). */
  fontSize: number
}

export type Usuario = {
  correo: string
  nombre: string
  tipo: "medico" | "asistente"
  /** `null` si no se ha registrado (usuarios anteriores). */
  genero: "femenino" | "masculino" | null
  activo: boolean
}
