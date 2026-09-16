import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type { HistorialClinicoDTO } from "@/api/types"
import { toClinicalHistory, toHistorialPayload } from "@/lib/mappers"
import type { ClinicalHistory } from "@/types/clinic"

// No hay acción de lectura: el historial viene en `GET /pacientes/:id` y
// `getPatient` ya lo entrega mapeado en `patient.clinicalHistory`.

/**
 * `POST /historial` — crea el historial clínico del paciente. Solo puede haber
 * uno por paciente (409 si ya existe). Las preguntas omitidas o en blanco
 * quedan sin responder.
 */
export async function createClinicalHistory(
  patientId: number,
  answers: Partial<ClinicalHistory>,
): Promise<ClinicalHistory> {
  const { data } = await api.post<HistorialClinicoDTO>(
    ENDPOINTS.historial.root,
    toHistorialPayload(patientId, answers),
  )
  return toClinicalHistory(data)
}

/**
 * `PUT /historial` — actualiza el historial clínico del paciente (404 si no
 * tiene). Una pregunta omitida conserva su respuesta; en blanco, se borra.
 */
export async function updateClinicalHistory(
  patientId: number,
  answers: Partial<ClinicalHistory>,
): Promise<ClinicalHistory> {
  const { data } = await api.put<HistorialClinicoDTO>(
    ENDPOINTS.historial.root,
    toHistorialPayload(patientId, answers),
  )
  return toClinicalHistory(data)
}
