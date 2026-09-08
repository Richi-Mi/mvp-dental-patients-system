import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type {
  AdminRegisterPayload,
  MessageResponse,
  UpdateUsuarioPayload,
  UsuarioDTO,
} from "@/api/types"
import { toUsuario } from "@/lib/mappers"
import type { Usuario } from "@/types/clinic"

/** `GET /user/all` — requiere rol `medico`. */
export async function listUsers(): Promise<Usuario[]> {
  const { data } = await api.get<UsuarioDTO[]>(ENDPOINTS.user.all)
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
