import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type {
  AjustesActualizadosDTO,
  AjustesDTO,
  UpdateAjustesPayload,
} from "@/api/types"
import { toAjustes } from "@/lib/mappers"
import type { Ajustes } from "@/types/clinic"

/** `GET /ajustes` — requiere rol `medico`; sin guardar, valores por defecto. */
export async function getAjustes(): Promise<Ajustes> {
  const { data } = await api.get<AjustesDTO>(ENDPOINTS.ajustes.root)
  return toAjustes(data)
}

/**
 * `PUT /ajustes` — campo omitido = no cambia. Si `autocompletarCitas` queda
 * activo, el backend completa en ese momento las citas confirmadas de hace más
 * de 24 h y devuelve cuántas (`citasCompletadas`).
 */
export async function updateAjustes(
  payload: UpdateAjustesPayload,
): Promise<{ ajustes: Ajustes; citasCompletadas: number }> {
  const { data } = await api.put<AjustesActualizadosDTO>(
    ENDPOINTS.ajustes.root,
    payload,
  )
  return {
    ajustes: toAjustes(data),
    citasCompletadas: Number(data.citasCompletadas) || 0,
  }
}
