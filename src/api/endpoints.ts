/** Every backend route in one place (see ENDPOINTS.md). */
export const ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth",
  },
  user: {
    me: "/user",
    updateMe: "/user/update",
    all: "/user/all",
    medicos: "/user/medicos",
    dashboard: "/user/dashboard",
    byCorreo: (correo: string) => `/user/admin/${encodeURIComponent(correo)}`,
    adminRegister: "/user/admin/register",
  },
  pacientes: {
    root: "/pacientes",
    byId: (id: number) => `/pacientes/${id}`,
    /** `GET` lista las fotos; `POST` sube imágenes (multipart, campo `fotos`). */
    fotos: (id: number) => `/pacientes/${id}/fotos`,
    /** `DELETE` elimina la foto. Para descargarla se usa la `url` que manda el API. */
    foto: (id: number, nombre: string) =>
      `/pacientes/${id}/fotos/${encodeURIComponent(nombre)}`,
  },
  /** `GET` lee y `PUT` guarda los ajustes del usuario autenticado. */
  ajustes: {
    root: "/ajustes",
  },
  /** `POST` crea y `PUT` actualiza; se consulta dentro de `GET /pacientes/:id`. */
  historial: {
    root: "/historial",
  },
  citas: {
    root: "/citas",
    byId: (id: string) => `/citas/${encodeURIComponent(id)}`,
    /** Agenda de otro médico: la usa un asistente (GET lista, POST agenda). */
    byMedico: (correo: string) =>
      `/citas/medico/${encodeURIComponent(correo)}`,
    /** Una cita de otro médico: un asistente la edita (PUT) o la borra (DELETE). */
    byMedicoId: (correo: string, id: string) =>
      `/citas/medico/${encodeURIComponent(correo)}/${encodeURIComponent(id)}`,
  },
} as const
