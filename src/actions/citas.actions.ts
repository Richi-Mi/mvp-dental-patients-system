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
 */
export async function listAppointments(
  query: CitasQuery = {},
): Promise<Appointment[]> {
  const { data } = await api.get<CitasAgrupadasDTO>(ENDPOINTS.citas.root, {
    params: query,
  })
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

/** `POST /citas` */
export async function createAppointment(
  input: AppointmentInput,
): Promise<Appointment> {
  const { data } = await api.post<CitaDTO>(
    ENDPOINTS.citas.root,
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
