import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type {
  LoginPayload,
  LoginResponse,
  MessageResponse,
  RegisterPayload,
  UsuarioDTO,
} from "@/api/types"
import { toUsuario } from "@/lib/mappers"
import type { Usuario } from "@/types/clinic"

/** `PUT /auth` — inicia sesión y devuelve el JWT + el usuario. */
export async function login(
  payload: LoginPayload,
): Promise<{ token: string; usuario: Usuario }> {
  const { data } = await api.put<LoginResponse>(ENDPOINTS.auth.login, payload)
  return { token: data.token, usuario: toUsuario(data.usuario) }
}

/** `POST /auth/register` — alta pública (siempre crea un `asistente`). */
export async function register(
  payload: RegisterPayload,
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>(
    ENDPOINTS.auth.register,
    payload,
  )
  return data
}

/** `GET /user` — usuario autenticado según el token. */
export async function getCurrentUser(): Promise<Usuario> {
  const { data } = await api.get<UsuarioDTO>(ENDPOINTS.user.me)
  return toUsuario(data)
}

/** `PUT /user/update` — actualiza el nombre del usuario autenticado. */
export async function updateCurrentUser(payload: {
  nombre?: string
}): Promise<Usuario> {
  const { data } = await api.put<UsuarioDTO>(ENDPOINTS.user.updateMe, payload)
  return toUsuario(data)
}
