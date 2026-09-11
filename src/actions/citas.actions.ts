import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type {
  CitaDTO,
  CitasAgrupadasDTO,
  CitasQuery,
  CreateCitaPayload,
  MessageResponse,
  UpdateCitaPayload,
} from "@/api/types"
import { toAppointment, toISODateTime } from "@/lib/mappers"
import type { Appointment, AppointmentInput } from "@/types/clinic"

/**
 * `GET /citas` — el backend responde agrupado por `YYYY-MM-DD`; aquí se
 * aplana para que la UI agrupe por día local (ver `groupByDay`).
 *
 * Con `medicoEmail` consulta `GET /citas/medico/:correo`, la agenda de ese
 * médico, que es como un asistente ve la agenda ajena.
 */
export async function listAppointments(
  query: CitasQuery = {},
  medicoEmail?: string | null,
): Promise<Appointment[]> {
  const url = medicoEmail
    ? ENDPOINTS.citas.byMedico(medicoEmail)
    : ENDPOINTS.citas.root
  const { data } = await api.get<CitasAgrupadasDTO>(url, { params: query })
  return Object.values(data ?? {})
    .flat()
    .map(toAppointment)
}

function toCitaPayload(input: Partial<AppointmentInput>): UpdateCitaPayload {
  const payload: UpdateCitaPayload = {}
  if (input.patientId !== undefined) payload.id_paciente = input.patientId
  if (input.date && input.time) {
    payload.fecha_cita = toISODateTime(input.date, input.time)
  }
  if (input.motivo !== undefined) payload.motivo = input.motivo
  if (input.status !== undefined) payload.estatus = input.status
  return payload
}

/**
 * `POST /citas` — cita del médico autenticado.
 *
 * Con `medicoEmail` usa `POST /citas/medico/:correo`: la cita queda a nombre
 * de ese médico, que es como un asistente agenda por él.
 */
export async function createAppointment(
  input: AppointmentInput,
  medicoEmail?: string | null,
): Promise<Appointment> {
  const url = medicoEmail
    ? ENDPOINTS.citas.byMedico(medicoEmail)
    : ENDPOINTS.citas.root
  const { data } = await api.post<CitaDTO>(
    url,
    toCitaPayload(input) as CreateCitaPayload,
  )
  return toAppointment(data)
}

/** `PUT /citas/:id` */
export async function updateAppointment(
  id: string,
  input: Partial<AppointmentInput>,
): Promise<Appointment> {
  const { data } = await api.put<CitaDTO>(
    ENDPOINTS.citas.byId(id),
    toCitaPayload(input),
  )
  return toAppointment(data)
}

/** `DELETE /citas/:id` — borrado físico. */
export async function deleteAppointment(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(ENDPOINTS.citas.byId(id))
  return data
}
