import axios, { AxiosError, type AxiosInstance } from "axios"

import { useAuthStore } from "@/store/auth.store"
import { useOfflineStore } from "@/store/offline.store"

export const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/** Normalized error thrown by every action in `@/actions`. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/**
 * Sin respuesta del servidor (`status` 0): no hay internet, el servidor no
 * está disponible o se agotó el tiempo. Los cambios se guardan en la cola sin
 * conexión (ver `saveOrQueue`).
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0
}

/**
 * The backend authenticates with a bare `token` header (not `Authorization`),
 * see ENDPOINTS.md § Autenticación.
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  // Con una conexión que se queda colgada la petición falla aquí y el cambio
  // pasa a la cola sin conexión, en vez de dejar el formulario "Guardando...".
  timeout: 20_000,
})

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) config.headers.set("token", token)
  return config
})

/**
 * The backend answers every error as `{ message }` (schema validation included,
 * as 422); `summary`/`error` cover Elysia's raw error body, just in case.
 */
function extractMessage(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) return data
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>
    for (const key of ["message", "summary", "error"] as const) {
      if (typeof body[key] === "string" && body[key]) return body[key]
    }
  }
  if (status === 0) return "No se pudo conectar con el servidor"
  return `Error inesperado del servidor (${status})`
}

api.interceptors.response.use(
  (response) => {
    useOfflineStore.getState().setReachable(true)
    return response
  },
  (error: AxiosError) => {
    const status = error.response?.status ?? 0
    const message = extractMessage(error.response?.data, status)

    // Cualquier respuesta, aunque sea un error, prueba que hay conexión.
    if (!axios.isCancel(error)) {
      useOfflineStore.getState().setReachable(status !== 0)
    }

    // A 401 outside of the login/registro routes means the session expired.
    const url = error.config?.url ?? ""
    if (status === 401 && !url.startsWith("/auth")) {
      useAuthStore.getState().clearSession()
    }

    return Promise.reject(new ApiError(message, status))
  },
)
