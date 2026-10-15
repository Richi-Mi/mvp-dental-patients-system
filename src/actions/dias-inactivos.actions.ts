import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type { DiaInactivoDTO, DiasInactivosDTO } from "@/api/types"

/**
 * `GET /citas/dias-inactivos` — días (`yyyy-mm-dd`) en que el médico no
 * atiende. Con `medicoEmail` pide los de ese médico (un asistente).
 */
export async function listInactiveDays(
  medicoEmail?: string | null,
): Promise<string[]> {
  const url = medicoEmail
    ? ENDPOINTS.citas.diasInactivosByMedico(medicoEmail)
    : ENDPOINTS.citas.diasInactivos
  const { data } = await api.get<DiasInactivosDTO>(url)
  return data ?? []
}

/**
 * `PUT` (marcar) o `DELETE` (volver a activar)
 * `/citas/dias-inactivos/:fecha`. Las dos son idempotentes.
 */
export async function setInactiveDay(
  date: string,
  inactive: boolean,
  medicoEmail?: string | null,
): Promise<DiaInactivoDTO> {
  const url = medicoEmail
    ? ENDPOINTS.citas.diaInactivoByMedico(medicoEmail, date)
    : ENDPOINTS.citas.diaInactivo(date)
  const { data } = inactive
    ? await api.put<DiaInactivoDTO>(url)
    : await api.delete<DiaInactivoDTO>(url)
  return data
}
