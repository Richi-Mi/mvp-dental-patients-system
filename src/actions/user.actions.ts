import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type {
  AdminRegisterPayload,
  DashboardDTO,
  MessageResponse,
  UpdateUsuarioPayload,
  UsuarioDTO,
} from "@/api/types"
import { toDashboard, toUsuario } from "@/lib/mappers"
import type { DashboardMetrics, Usuario } from "@/types/clinic"

/**
 * `GET /user/dashboard` — métricas del año ya agregadas por el backend.
 * Sin `year` responde con el año actual; fuera de 2000–2100 devuelve 400.
 */
export async function getDashboard(year?: number): Promise<DashboardMetrics> {
  const { data } = await api.get<DashboardDTO>(ENDPOINTS.user.dashboard, {
    params: year === undefined ? undefined : { year },
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
