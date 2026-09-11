/**
 * Server DTOs — shapes returned by the Elysia backend (see ENDPOINTS.md).
 * These mirror the API 1:1; the UI domain types live in `@/types/clinic`
 * and the translation between both happens in `@/lib/mappers`.
 */

export type TipoUsuario = "medico" | "asistente"

export type UsuarioDTO = {
  correo: string
  nombre: string
  tipo: TipoUsuario
  activo: boolean
}

export type TratamientoDTO = {
  id: string
  fecha: string
  nombre: string
  /**
   * Las columnas `decimal` de Postgres llegan como string ("1200.00"), no
   * como number: hay que convertirlas antes de reenviarlas (ver `toNumber`
   * en `@/lib/mappers`).
   */
  costo: number | string | null
  cuenta: number | string | null
  id_paciente: number
}

export type PacienteDTO = {
  id: number
  cp: string | null
  direccion: string | null
  edad: string | null
  correo: string | null
  telefono: string | null
  notas: string | null
  nombre: string
  sexo: string
  isActive: boolean
  correo_medico: string | null
  medico?: UsuarioDTO | null
  tratamientos?: TratamientoDTO[]
  proximasCitas?: CitaDTO[]
}

export type CitaDTO = {
  id: string
  fecha_cita: string
  motivo: string
  estatus: string
  correo_medico: string
  id_paciente: number
  medico?: UsuarioDTO
  paciente?: PacienteDTO
}

/** `GET /citas` responds with citas grouped by `YYYY-MM-DD`. */
export type CitasAgrupadasDTO = Record<string, CitaDTO[]>

// ---- Request payloads ----

export type LoginPayload = { correo: string; password: string }

export type LoginResponse = { token: string; usuario: UsuarioDTO }

export type RegisterPayload = {
  nombre: string
  correo: string
  password: string
}

export type AdminRegisterPayload = RegisterPayload & { tipo: TipoUsuario }

export type UpdateUsuarioPayload = {
  nombre?: string
  tipo?: TipoUsuario
  activo?: boolean
}

export type TratamientoPayload = {
  fecha: string
  nombre: string
  costo?: number | null
  cuenta?: number | null
}

export type CreatePacientePayload = {
  nombre: string
  sexo: string
  cp: string
  direccion: string
  edad: string
  correo: string
  telefono: string
  notas?: string
  correo_medico?: string
}

export type UpdatePacientePayload = Partial<CreatePacientePayload> & {
  tratamientos?: TratamientoPayload[]
}

/** `GET /user/dashboard` — métricas anuales ya agregadas por el backend. */
export type DashboardDTO = {
  year: number
  ventasTotales: number
  consultasTotales: number
  pacientesTotales: number
  dineroPorCobrar: number
  /** 12 posiciones, índice 0 = enero. */
  ventasPorMes: number[]
  /** 12 posiciones, índice 0 = enero. */
  citasPorMes: number[]
}

export type DashboardQuery = { year?: number }

/** `GET /pacientes` — un asistente pide los pacientes del médico que atiende. */
export type PacientesQuery = { correo_medico?: string }

export type CitasQuery = {
  year?: number
  month?: number
  week?: number
  query?: string
}

export type CreateCitaPayload = {
  id_paciente: number
  fecha_cita: string
  motivo: string
  estatus: string
}

export type UpdateCitaPayload = Partial<CreateCitaPayload>

export type MessageResponse = { message: string }
