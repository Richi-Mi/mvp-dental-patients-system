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
  },
} as const
