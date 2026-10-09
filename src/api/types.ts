/**
 * Server DTOs — shapes returned by the Elysia backend (see ENDPOINTS.md).
 * These mirror the API 1:1; the UI domain types live in `@/types/clinic`
 * and the translation between both happens in `@/lib/mappers`.
 */

export type TipoUsuario = "medico" | "asistente"

export type GeneroUsuario = "femenino" | "masculino"

export type UsuarioDTO = {
  correo: string
  nombre: string
  tipo: TipoUsuario
  /**
   * `null` en los usuarios creados antes de capturarlo. Opcional porque solo
   * `PUT /auth` y `GET /user` lo garantizan.
   */
  genero?: GeneroUsuario | null
  activo: boolean
}

export type TratamientoDTO = {
  id: string
  fecha: string
  /** `"SIN_MOTIVO"` si se capturó sin nombre; `toTreatment` lo deja vacío. */
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
  /** `YYYY-MM-DD`; `null` en los pacientes creados antes de capturarla. */
  fecha_nacimiento: string | null
  correo: string | null
  telefono: string | null
  notas: string | null
  nombre: string
  sexo: string
  isActive: boolean
  /** Timestamp ISO de registro; los pacientes anteriores tienen la fecha de la migración. */
  fecha_creacion: string
  correo_medico: string | null
  medico?: UsuarioDTO | null
  tratamientos?: TratamientoDTO[]
  proximasCitas?: CitaDTO[]
  /** Solo en `GET /pacientes/:id`; `null` si el paciente no tiene historial. */
  historialClinico?: HistorialClinicoDTO | null
}

export type PreguntaHistorial = `pregunta_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`

export type HistorialClinicoDTO = {
  id_paciente: number
  /** Siempre trae las 10 preguntas; `null` = sin responder. */
  historial: Record<PreguntaHistorial, string | null>
}

/** Foto de un paciente (`/pacientes/:id/fotos`); el backend las guarda en WebP. */
export type FotoDTO = {
  /** Nombre del archivo en el servidor (`${id_paciente}_${uuid}.webp`); identifica la foto. */
  img_name: string
  /** Timestamp ISO de la carga. */
  fecha_subida: string
  id_paciente: number
  /**
   * Ruta del API que devuelve la imagen. Exige el header `token`, así que no
   * sirve en un `<img src>`: se descarga con Axios (`getPhotoFile`).
   */
  url: string
}

export type CitaDTO = {
  id: string
  fecha_cita: string
  /**
   * `HH:MM` (24 h) en el reloj del consultorio, que es el mismo en que se
   * muestra `fecha_cita`. Siempre posterior a la hora de inicio.
   */
  horaFin: string
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
  /**
   * Vacío, el backend lo guarda como `"SIN_MOTIVO"`; en ese caso necesita
   * `costo` o `cuenta` (400 si faltan los tres).
   */
  nombre: string
  costo?: number | null
  cuenta?: number | null
}

export type CreatePacientePayload = {
  nombre: string
  sexo: string
  cp: string
  direccion: string
  /** `YYYY-MM-DD`; omitida o `null` = sin fecha de nacimiento. */
  fecha_nacimiento?: string | null
  correo: string
  telefono: string
  notas?: string
  correo_medico?: string
}

export type UpdatePacientePayload = Partial<
  Omit<CreatePacientePayload, "fecha_nacimiento">
> & {
  /** Omitida = no cambia; `null` = se borra. */
  fecha_nacimiento?: string | null
  tratamientos?: TratamientoPayload[]
}

/**
 * `POST /historial` y `PUT /historial`. Pregunta omitida: queda sin responder
 * al crear y no cambia al actualizar. `null` o `""`: sin responder.
 */
export type HistorialPayload = {
  id_paciente: number
  historial: Partial<Record<PreguntaHistorial, string | null>>
}

/**
 * `GET /user/dashboard` — métricas ya agregadas por el backend. Los totales
 * son del periodo pedido (un mes, o todo el año); las series, del año completo.
 */
export type DashboardDTO = {
  year: number
  /** 1 = enero … 12 = diciembre; `null` = todo el año. */
  month: number | null
  ventasTotales: number
  consultasTotales: number
  dineroPorCobrar: number
  /** Pacientes activos registrados en el periodo. */
  pacientesNuevos: number
  /** Histórico de pacientes activos: no se acota al periodo. */
  pacientesTotales: number
  /** 12 posiciones, índice 0 = enero. */
  ventasPorMes: number[]
  /** 12 posiciones, índice 0 = enero. */
  citasPorMes: number[]
  /**
   * Citas del periodo por `estatus`, con la llave sin espacios y en minúsculas
   * tal como está guardada (incluido el antiguo "pendiente"). Suma
   * `consultasTotales`. Opcional: un backend anterior no lo manda.
   */
  citasPorEstatus?: Record<string, number>
}

/** Sin `month` responde con todo el año. */
export type DashboardQuery = { year?: number; month?: number }

/** `GET /ajustes` — ajustes del usuario autenticado (médico o asistente). */
export type AjustesDTO = {
  /** Las citas `confirmada` de hace más de 24 h pasan solas a `completada`. */
  autocompletarCitas: boolean
  /** Primera y última hora (0–23) de la agenda; `apertura <= cierre`. */
  horario: { apertura: number; cierre: number }
  /** Porcentaje del tamaño de letra del navegador (90–130, pasos de 5). */
  tamanoLetra: number
}

/**
 * `PUT /ajustes` — campo omitido = no cambia; `horario` va completo. Solo un
 * médico puede mandar `autocompletarCitas` (un asistente recibe 403).
 */
export type UpdateAjustesPayload = Partial<AjustesDTO>

/** Respuesta de `PUT /ajustes`. */
export type AjustesActualizadosDTO = AjustesDTO & {
  /** Citas que el backend completó al guardar (0 si quedó desactivado). */
  citasCompletadas: number
}

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
  /** `HH:MM`. Omitida: la cita dura una hora (al editar, mover la cita conserva su duración). */
  horaFin?: string
  motivo: string
  estatus: string
}

export type UpdateCitaPayload = Partial<CreateCitaPayload>

export type MessageResponse = { message: string }
