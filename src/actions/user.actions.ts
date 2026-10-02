import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type {
  AdminRegisterPayload,
  DashboardDTO,
  DashboardQuery,
  MessageResponse,
  UpdateUsuarioPayload,
  UsuarioDTO,
} from "@/api/types"
import { toDashboard, toUsuario } from "@/lib/mappers"
import type { DashboardMetrics, Usuario } from "@/types/clinic"

/**
 * `GET /user/dashboard` — métricas ya agregadas por el backend, de un año o de
 * un mes de ese año. Sin `year` responde con el año actual y sin `month` con
 * todo el año; fuera de 2000–2100 o de 1–12 devuelve 422.
 */
export async function getDashboard(
  query: DashboardQuery = {},
): Promise<DashboardMetrics> {
  // Axios omite los parámetros `undefined`.
  const { data } = await api.get<DashboardDTO>(ENDPOINTS.user.dashboard, {
    params: query,
  })
  return toDashboard(data)
}

/** `GET /user/all` — requiere rol `medico`. */
export async function listUsers(): Promise<Usuario[]> {
  const { data } = await api.get<UsuarioDTO[]>(ENDPOINTS.user.all)
  return data.map(toUsuario)
}

/**
 * `GET /user/medicos` — médicos activos. Cualquier usuario autenticado puede
 * consultarla: un asistente la necesita para elegir de qué médico ve la agenda.
 */
export async function listMedicos(): Promise<Usuario[]> {
  const { data } = await api.get<UsuarioDTO[]>(ENDPOINTS.user.medicos)
  return data.map(toUsuario)
}

/** `GET /user/admin/:correo` — requiere rol `medico`. */
export async function getUser(correo: string): Promise<Usuario> {
  const { data } = await api.get<UsuarioDTO>(ENDPOINTS.user.byCorreo(correo))
  return toUsuario(data)
}

/** `PUT /user/admin/:correo` — alta/baja lógica y cambio de rol. */
export async function updateUser(
  correo: string,
  payload: UpdateUsuarioPayload,
): Promise<Usuario> {
  const { data } = await api.put<UsuarioDTO>(
    ENDPOINTS.user.byCorreo(correo),
    payload,
  )
  return toUsuario(data)
}

/** `POST /user/admin/register` — crea staff pudiendo elegir el `tipo`. */
export async function registerStaff(
  payload: AdminRegisterPayload,
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>(
    ENDPOINTS.user.adminRegister,
    payload,
  )
  return data
}
