/**
 * Cola de cambios hechos sin conexión (ver `store/offline.store.ts`).
 *
 * Todo aquí es puro: el store guarda la cola en `localStorage`, los hooks la
 * aplican sobre los datos del servidor con `applyTo*` para que la pantalla ya
 * muestre los cambios pendientes, y la sincronización (`useOfflineSync`) los
 * envía en orden y los incorpora a la caché con esas mismas funciones.
 */
import type { CitasQuery } from "@/api/types"
import {
  CLINICAL_HISTORY_QUESTIONS,
  STATUS_META,
  formatLongDate,
  isoWeekDates,
  todayISO,
} from "@/lib/clinic-data"
import { toISODateTime, toLocalISODate } from "@/lib/mappers"
import type {
  Appointment,
  AppointmentInput,
  ClinicalHistory,
  Patient,
  PatientInput,
  Treatment,
} from "@/types/clinic"

/** Cambios al expediente: `PUT /pacientes/:id` (los tratamientos reemplazan la lista). */
export type PatientChanges = Partial<PatientInput> & { treatments?: Treatment[] }

export type OfflineOperation =
  | {
      type: "cita.create"
      /** El mismo id que arma el backend (ver `citaIdFor`). */
      citaId: string
      /** Médico dueño de la agenda donde queda la cita. */
      medicoCorreo: string
      /** `true` = `POST /citas/medico/:correo` (un asistente agenda por el médico). */
      viaMedico: boolean
      input: AppointmentInput
    }
  | { type: "cita.update"; citaId: string; input: Partial<AppointmentInput> }
  | { type: "cita.delete"; citaId: string }
  | {
      type: "paciente.create"
      /** Id temporal (negativo) mientras el servidor no asigne el real. */
      patientId: number
      medicoCorreo: string
      input: PatientInput & { birthDate: string }
    }
  | { type: "paciente.update"; patientId: number; input: PatientChanges }
  | { type: "paciente.delete"; patientId: number }
  | {
      type: "historial.create" | "historial.update"
      patientId: number
      answers: Partial<ClinicalHistory>
    }

/** Un cambio de la cola tal como lo arma un hook, antes de guardarlo. */
export type NewOperation = OfflineOperation & {
  /** Nombre del paciente al que se refiere, para describir el cambio. */
  subject: string
}

export type PendingOperation = NewOperation & {
  id: string
  /** Correo de quien hizo el cambio: solo su sesión lo sincroniza. */
  owner: string
  /** Timestamp ISO. */
  createdAt: string
  /** Intentos que el servidor respondió con 500 (ver `MAX_SERVER_ERRORS`). */
  attempts?: number
}

export type OperationType = OfflineOperation["type"]

type OperationOf<T extends OperationType> = Extract<PendingOperation, { type: T }>

/** Tras este número de 500 seguidos el cambio se descarta para no bloquear la cola. */
export const MAX_SERVER_ERRORS = 3

// ---- Ids ----

/** Los pacientes creados sin conexión llevan un id negativo hasta sincronizarse. */
export function isTempId(id: number): boolean {
  return id < 0
}

/**
 * Negativo y con un componente aleatorio: dos pacientes creados en el mismo
 * milisegundo (dos pestañas, dos usuarios) no deben terminar con el mismo id
 * temporal, porque `replacePatientId` lo reemplaza en toda la cola guardada.
 */
export function newTempPatientId(): number {
  return -(Date.now() * 1000 + Math.floor(Math.random() * 1000))
}

/** Id con el que el backend guarda una cita: `${correo_medico}_${fecha_cita ISO}`. */
export function citaIdFor(medicoCorreo: string, date: string, time: string): string {
  return `${medicoCorreo}_${toISODateTime(date, time)}`
}

/** Paciente al que apunta el cambio, si apunta a uno. */
export function patientIdOf(op: OfflineOperation): number | undefined {
  switch (op.type) {
    case "cita.create":
    case "cita.update":
      return op.input.patientId
    case "cita.delete":
      return undefined
    default:
      return op.patientId
  }
}

/**
 * ¿El cambio depende de un paciente que el servidor todavía no tiene? Al
 * sincronizar, el alta va antes y reemplaza el id temporal por el real
 * (`replacePatientId`), así que si sigue uno temporal es que el alta falló.
 */
export function dependsOnTempPatient(op: OfflineOperation): boolean {
  if (op.type === "paciente.create") return false
  const id = patientIdOf(op)
  return id !== undefined && isTempId(id)
}

/**
 * ¿Hay, en la cola, un alta de esta misma cita sin sincronizar? A diferencia
 * de un paciente temporal, el id de una cita creada sin conexión ya es el
 * definitivo (`citaIdFor`), pero la fila no existe en el servidor hasta que
 * esa alta se sincroniza: editarla o borrarla directo respondería 404.
 */
export function dependsOnPendingCita(
  op: OfflineOperation,
  queue: PendingOperation[],
  owner: string,
): boolean {
  if (op.type !== "cita.update" && op.type !== "cita.delete") return false
  return queue.some((o) => o.owner === owner && o.type === "cita.create" && o.citaId === op.citaId)
}

function withPatientId(
  op: OfflineOperation,
  from: number,
  to: number,
): OfflineOperation {
  switch (op.type) {
    case "cita.create":
      return op.input.patientId === from
        ? { ...op, input: { ...op.input, patientId: to } }
        : op
    case "cita.update":
      return op.input.patientId === from
        ? { ...op, input: { ...op.input, patientId: to } }
        : op
    case "cita.delete":
      return op
    default:
      return op.patientId === from ? { ...op, patientId: to } : op
  }
}

/** Cambia el id temporal de un paciente por el que asignó el servidor. */
export function replacePatientId<T extends OfflineOperation>(
  queue: T[],
  tempId: number,
  realId: number,
): T[] {
  // El spread conserva el resto de los campos (id, owner…) del cambio.
  return queue.map((op) => withPatientId(op, tempId, realId) as T)
}

/** Reemplaza en el cambio los ids temporales que ya tienen id real. */
export function resolvePatientIds<T extends OfflineOperation>(
  op: T,
  resolved: Record<number, number>,
): T {
  const id = patientIdOf(op)
  const real = id === undefined ? undefined : resolved[id]
  return real === undefined ? op : (withPatientId(op, id!, real) as T)
}

// ---- Compactación ----

/** Quita las claves `undefined`: un campo omitido no pisa el valor anterior. */
function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}

/**
 * Agrega un cambio a la cola fusionándolo con los pendientes de la misma
 * entidad, para mandar al servidor lo mínimo y en un orden que respete las
 * dependencias:
 *
 * - Editar una cita creada sin conexión modifica su alta (el id sigue a la
 *   fecha y hora); borrarla la saca de la cola sin llegar al servidor.
 * - Varias ediciones de la misma cita, del mismo expediente o del mismo
 *   historial se funden en una.
 * - Dar de baja un paciente creado sin conexión descarta su alta y todo lo que
 *   dependía de él.
 *
 * El cambio fusionado pasa al final de la cola: así queda detrás de lo que
 * pudiera necesitar (p. ej. el alta de un paciente).
 */
export function addOperation(
  queue: PendingOperation[],
  op: PendingOperation,
): PendingOperation[] {
  const mine = (o: PendingOperation) => o.owner === op.owner
  const without = (target: PendingOperation) => queue.filter((o) => o !== target)

  switch (op.type) {
    case "cita.update": {
      const target = queue.find(
        (o): o is OperationOf<"cita.create" | "cita.update"> =>
          mine(o) &&
          (o.type === "cita.create" || o.type === "cita.update") &&
          o.citaId === op.citaId,
      )
      if (!target) return [...queue, op]
      if (target.type === "cita.create") {
        const input = { ...target.input, ...defined(op.input) }
        const citaId = citaIdFor(target.medicoCorreo, input.date, input.time)
        return [...without(target), { ...target, input, citaId }]
      }
      return [
        ...without(target),
        { ...target, input: { ...target.input, ...defined(op.input) } },
      ]
    }

    case "cita.delete": {
      const created = queue.find(
        (o) => mine(o) && o.type === "cita.create" && o.citaId === op.citaId,
      )
      if (created) return without(created)
      return [
        ...queue.filter(
          (o) => !(mine(o) && o.type === "cita.update" && o.citaId === op.citaId),
        ),
        op,
      ]
    }

    case "paciente.update": {
      const target = queue.find(
        (o): o is OperationOf<"paciente.update"> =>
          mine(o) && o.type === "paciente.update" && o.patientId === op.patientId,
      )
      if (!target) return [...queue, op]
      return [
        ...without(target),
        { ...target, subject: op.subject, input: { ...target.input, ...defined(op.input) } },
      ]
    }

    case "paciente.delete": {
      const created = queue.find(
        (o) => mine(o) && o.type === "paciente.create" && o.patientId === op.patientId,
      )
      // Nunca existió en el servidor: se descarta junto con lo que dependía de él.
      if (created) {
        return queue.filter((o) => !(mine(o) && patientIdOf(o) === op.patientId))
      }
      return [
        ...queue.filter(
          (o) =>
            !(
              mine(o) &&
              (o.type === "paciente.update" ||
                o.type === "historial.create" ||
                o.type === "historial.update") &&
              o.patientId === op.patientId
            ),
        ),
        op,
      ]
    }

    case "historial.create":
    case "historial.update": {
      // Si ya hay uno pendiente se conserva su tipo: un alta seguida de una
      // edición sigue siendo un alta, con las respuestas combinadas.
      const target = queue.find(
        (o): o is OperationOf<"historial.create" | "historial.update"> =>
          mine(o) &&
          (o.type === "historial.create" || o.type === "historial.update") &&
          o.patientId === op.patientId,
      )
      if (!target) return [...queue, op]
      return [
        ...without(target),
        { ...target, answers: { ...target.answers, ...defined(op.answers) } },
      ]
    }

    default:
      return [...queue, op]
  }
}

// ---- Cambios sobre los datos del servidor ----

export function appointmentFromCreate(
  op: Extract<NewOperation, { type: "cita.create" }>,
): Appointment {
  return {
    id: op.citaId,
    patientId: op.input.patientId,
    patientName: op.subject,
    date: op.input.date,
    time: op.input.time,
    status: op.input.status,
    motivo: op.input.motivo,
  }
}

export function applyAppointmentChanges(
  appointment: Appointment,
  input: Partial<AppointmentInput>,
): Appointment {
  return { ...appointment, ...defined(input) }
}

export function patientFromCreate(
  op: Extract<NewOperation, { type: "paciente.create" }>,
  createdAt?: string,
): Patient {
  const { input } = op
  return {
    id: op.patientId,
    name: input.name,
    birthDate: input.birthDate || null,
    gender: input.gender,
    phone: input.phone,
    email: input.email,
    address: input.address,
    cp: input.cp,
    notes: input.notes,
    medicoEmail: op.medicoCorreo,
    createdAt: createdAt ? toLocalISODate(createdAt) : todayISO(),
    treatments: [],
    upcoming: [],
    clinicalHistory: null,
  }
}

export function applyPatientChanges(patient: Patient, input: PatientChanges): Patient {
  return { ...patient, ...defined(input) }
}

/** Respuestas finales tras guardar `answers` (en blanco = sin responder). */
export function mergeClinicalHistory(
  current: ClinicalHistory | null,
  answers: Partial<ClinicalHistory>,
): ClinicalHistory {
  const result = {} as ClinicalHistory
  for (const { key } of CLINICAL_HISTORY_QUESTIONS) {
    const value = answers[key]
    result[key] = value === undefined ? (current?.[key] ?? "") : value.trim()
  }
  return result
}

/** Qué agenda se está viendo: de qué médico, qué semana y con qué búsqueda. */
export type AgendaScope = {
  medicoCorreo: string
  /** Días (`yyyy-mm-dd`) que abarca la consulta. */
  dates: string[]
  search: string
}

/**
 * Alcance de una consulta de la agenda (`queryKeys.appointments.list`).
 * `medicoEmail` es `null` en la agenda propia.
 */
export function agendaScope(
  owner: string,
  medicoEmail: string | null,
  params: CitasQuery,
): AgendaScope {
  return {
    medicoCorreo: medicoEmail ?? owner,
    dates:
      params.year !== undefined && params.week !== undefined
        ? isoWeekDates(params.year, params.week)
        : [],
    search: params.query ?? "",
  }
}

/**
 * ¿Ya hay una cita a esa fecha y hora exactas? El backend arma el id de la
 * cita como `${correo_medico}_${fecha_cita}` (ver `citaIdFor`), así que un
 * médico no puede tener dos citas en el mismo horario, sean de quien sean:
 * un `POST` que choque responde 409. Sin conexión no hay quien lo valide, así
 * que `useAgenda` llama a esto antes de encolar, contra lo que ya se conoce
 * de esta agenda (servidor + cola); `excludeId` es la propia cita al moverla.
 */
export function findConflict(
  appointments: Appointment[],
  date: string,
  time: string,
  excludeId?: string,
): Appointment | undefined {
  return appointments.find((a) => a.date === date && a.time === time && a.id !== excludeId)
}

/** Como el `ILIKE` del backend: por nombre del paciente o motivo. */
function matchesSearch(appointment: Appointment, search: string): boolean {
  const term = search.trim().toLowerCase()
  return (
    !term ||
    appointment.patientName.toLowerCase().includes(term) ||
    appointment.motivo.toLowerCase().includes(term)
  )
}

/**
 * Citas de una semana de la agenda con los cambios pendientes aplicados. Solo
 * se filtran por fecha las citas que el cambio creó o movió: las del servidor
 * ya vienen en su semana (y las que caen fuera por huso horario se muestran en
 * `outOfWeek`).
 */
export function applyToAppointments(
  appointments: Appointment[],
  operations: PendingOperation[],
  scope: AgendaScope,
): Appointment[] {
  const inScope = (a: Appointment) =>
    scope.dates.includes(a.date) && matchesSearch(a, scope.search)

  let result = appointments
  for (const op of operations) {
    switch (op.type) {
      case "cita.create": {
        if (op.medicoCorreo !== scope.medicoCorreo) break
        const created = appointmentFromCreate(op)
        result = result.filter((a) => a.id !== created.id)
        if (inScope(created)) result = [...result, created]
        break
      }
      case "cita.update":
        result = result.flatMap((a) => {
          if (a.id !== op.citaId) return [a]
          const next = applyAppointmentChanges(a, op.input)
          const moved = next.date !== a.date
          return moved && !inScope(next) ? [] : [next]
        })
        break
      case "cita.delete":
        result = result.filter((a) => a.id !== op.citaId)
        break
      case "paciente.update":
        if (op.input.name === undefined) break
        result = result.map((a) =>
          a.patientId === op.patientId ? { ...a, patientName: op.input.name! } : a,
        )
        break
    }
  }
  return result
}

/** Pacientes de un médico (`GET /pacientes`) con los cambios pendientes. */
export function applyToPatients(
  patients: Patient[],
  operations: PendingOperation[],
  medicoCorreo: string,
): Patient[] {
  let result = patients
  for (const op of operations) {
    switch (op.type) {
      case "paciente.create":
        if (op.medicoCorreo !== medicoCorreo) break
        if (!result.some((p) => p.id === op.patientId)) {
          result = [...result, patientFromCreate(op, op.createdAt)]
        }
        break
      case "paciente.update": {
        // La lista no trae tratamientos: no se le agregan.
        const fields: PatientChanges = { ...op.input }
        delete fields.treatments
        result = result.map((p) =>
          p.id === op.patientId ? applyPatientChanges(p, fields) : p,
        )
        break
      }
      case "paciente.delete":
        result = result.filter((p) => p.id !== op.patientId)
        break
    }
  }
  return result
}

function byDateTime(a: Appointment, b: Appointment) {
  return a.date === b.date
    ? a.time.localeCompare(b.time)
    : a.date.localeCompare(b.date)
}

function isUpcoming(appointment: Appointment, now: Date): boolean {
  return new Date(toISODateTime(appointment.date, appointment.time)) >= now
}

/**
 * Expediente (`GET /pacientes/:id`) con los cambios pendientes. Un paciente
 * creado sin conexión sale de su alta; `undefined` si se dio de baja.
 */
export function applyToPatient(
  patient: Patient | undefined,
  patientId: number,
  operations: PendingOperation[],
  now: Date = new Date(),
): Patient | undefined {
  let result = patient
  for (const op of operations) {
    switch (op.type) {
      case "paciente.create":
        if (op.patientId === patientId && !result) {
          result = patientFromCreate(op, op.createdAt)
        }
        break
      case "paciente.update":
        if (result && op.patientId === patientId) {
          result = applyPatientChanges(result, op.input)
        }
        break
      case "paciente.delete":
        if (op.patientId === patientId) result = undefined
        break
      case "historial.create":
      case "historial.update":
        if (result && op.patientId === patientId) {
          result = {
            ...result,
            clinicalHistory: mergeClinicalHistory(result.clinicalHistory, op.answers),
          }
        }
        break
      case "cita.create": {
        if (!result || op.input.patientId !== patientId) break
        const created = { ...appointmentFromCreate(op), patientName: result.name }
        const upcoming = result.upcoming.filter((a) => a.id !== created.id)
        if (isUpcoming(created, now)) upcoming.push(created)
        result = { ...result, upcoming: upcoming.sort(byDateTime) }
        break
      }
      case "cita.update":
        if (!result || !result.upcoming.some((a) => a.id === op.citaId)) break
        result = {
          ...result,
          upcoming: result.upcoming
            .map((a) => (a.id === op.citaId ? applyAppointmentChanges(a, op.input) : a))
            .filter((a) => isUpcoming(a, now))
            .sort(byDateTime),
        }
        break
      case "cita.delete":
        if (!result) break
        result = {
          ...result,
          upcoming: result.upcoming.filter((a) => a.id !== op.citaId),
        }
        break
    }
  }
  return result
}

// ---- Textos ----

/** Descripción de un cambio para los avisos de la sincronización. */
export function describeOperation(op: NewOperation): string {
  const who = op.subject || "paciente sin nombre"
  switch (op.type) {
    case "cita.create":
      return `Nueva cita de ${who} (${formatLongDate(op.input.date)}, ${op.input.time} h)`
    case "cita.update": {
      const { status, ...rest } = defined(op.input)
      return status && Object.keys(rest).length === 0
        ? `Estatus «${STATUS_META[status].label}» en la cita de ${who}`
        : `Cambios en la cita de ${who}`
    }
    case "cita.delete":
      return `Eliminación de la cita de ${who}`
    case "paciente.create":
      return `Alta de ${who}`
    case "paciente.update": {
      const { treatments, ...fields } = defined(op.input)
      return treatments && Object.keys(fields).length === 0
        ? `Tratamientos de ${who}`
        : `Cambios en el expediente de ${who}`
    }
    case "paciente.delete":
      return `Baja de ${who}`
    case "historial.create":
    case "historial.update":
      return `Historial clínico de ${who}`
  }
}
