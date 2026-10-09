import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type { AjustesActualizadosDTO, AjustesDTO } from "@/api/types"
import { toAjustes, toAjustesPayload } from "@/lib/mappers"
import type { Ajustes } from "@/types/clinic"

/** `GET /ajustes` — los del usuario del token; sin guardar, valores por defecto. */
export async function getAjustes(): Promise<Ajustes> {
  const { data } = await api.get<AjustesDTO>(ENDPOINTS.ajustes.root)
  return toAjustes(data)
}

/**
 * `PUT /ajustes` — solo manda lo que cambia. Si activa `autocompletarCitas`
 * (solo un médico), el backend completa en ese momento las citas confirmadas
 * de hace más de 24 h y devuelve cuántas (`citasCompletadas`).
 */
export async function updateAjustes(
  changes: Partial<Ajustes>,
): Promise<{ ajustes: Ajustes; citasCompletadas: number }> {
  const { data } = await api.put<AjustesActualizadosDTO>(
    ENDPOINTS.ajustes.root,
    toAjustesPayload(changes),
  )
  return {
    ajustes: toAjustes(data),
    citasCompletadas: Number(data.citasCompletadas) || 0,
  }
}
