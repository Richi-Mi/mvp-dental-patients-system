import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type {
  PacienteDTO,
  PacientesQuery,
  UpdatePacientePayload,
} from "@/api/types"
import { toPacientePayload, toPatient, toTreatmentPayload } from "@/lib/mappers"
import type { Patient, PatientInput, Treatment } from "@/types/clinic"

/**
 * `GET /pacientes` — pacientes activos del médico autenticado, o los del
 * médico indicado en `medicoEmail` (un asistente no tiene pacientes propios).
 */
export async function listPatients(
  medicoEmail?: string | null,
): Promise<Patient[]> {
  const params: PacientesQuery | undefined = medicoEmail
    ? { correo_medico: medicoEmail }
    : undefined
  const { data } = await api.get<PacienteDTO[]>(ENDPOINTS.pacientes.root, {
    params,
  })
  return data.map(toPatient)
}

/** `GET /pacientes/:id` — incluye `tratamientos` y `proximasCitas`. */
export async function getPatient(id: number): Promise<Patient> {
  const { data } = await api.get<PacienteDTO>(ENDPOINTS.pacientes.byId(id))
  return toPatient(data)
}

/** `POST /pacientes` — `birthDate` (`yyyy-mm-dd`) es obligatoria. */
export async function createPatient(
  input: PatientInput & { birthDate: string; medicoEmail?: string | null },
): Promise<Patient> {
  const { data } = await api.post<PacienteDTO>(
    ENDPOINTS.pacientes.root,
    toPacientePayload(input),
  )
  return toPatient(data)
}

/**
 * `PUT /pacientes/:id` — actualización parcial.
 *
 * Ojo: si se envía `treatments`, el backend **reemplaza** por completo la
 * lista guardada, así que hay que mandar siempre la lista final completa.
 *
 * `birthDate`: omitida = no cambia; `null` = se borra la fecha guardada.
 */
export async function updatePatient(
  id: number,
  input: Partial<PatientInput> & {
    medicoEmail?: string | null
    treatments?: Treatment[]
  },
): Promise<Patient> {
  const { treatments, ...rest } = input
  const payload: UpdatePacientePayload = toPacientePayload(rest)
  if (treatments) payload.tratamientos = treatments.map(toTreatmentPayload)

  const { data } = await api.put<PacienteDTO>(
    ENDPOINTS.pacientes.byId(id),
    payload,
  )
  return toPatient(data)
}

/** `DELETE /pacientes/:id` — baja lógica (`isActive: false`). */
export async function deletePatient(id: number): Promise<Patient> {
  const { data } = await api.delete<PacienteDTO>(ENDPOINTS.pacientes.byId(id))
  return toPatient(data)
}
