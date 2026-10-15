import type { CitasQuery } from "@/api/types"

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  /** Ajustes del usuario; la caché se borra al cerrar sesión, basta una llave. */
  ajustes: {
    all: ["ajustes"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    byPeriod: (year: number, month: number | null) =>
      ["dashboard", year, month ?? "todo"] as const,
  },
  users: {
    all: ["usuarios"] as const,
    list: () => ["usuarios", "list"] as const,
    medicos: () => ["usuarios", "medicos"] as const,
    detail: (correo: string) => ["usuarios", "detail", correo] as const,
  },
  patients: {
    all: ["pacientes"] as const,
    /** `medicoEmail` distingue la lista propia de la del médico que ve un asistente. */
    list: (medicoEmail?: string | null) =>
      ["pacientes", "list", medicoEmail ?? "propio"] as const,
    detail: (id: number) => ["pacientes", "detail", id] as const,
  },
  /**
   * Fotos de pacientes. Van fuera de `["pacientes"]` para que invalidar al
   * paciente (p. ej. al guardar tratamientos) no vuelva a descargar imágenes.
   */
  photos: {
    all: ["fotos"] as const,
    list: (patientId: number) => ["fotos", "list", patientId] as const,
    /** Contenido (Blob) de una foto, por su `url`. */
    file: (url: string) => ["fotos", "file", url] as const,
  },
  appointments: {
    all: ["citas"] as const,
    list: (params: CitasQuery, medicoEmail?: string | null) =>
      ["citas", "list", medicoEmail ?? "propio", params] as const,
  },
  /** Días inactivos de la agenda propia o del médico que ve un asistente. */
  inactiveDays: {
    all: ["dias-inactivos"] as const,
    list: (medicoEmail?: string | null) =>
      ["dias-inactivos", medicoEmail ?? "propio"] as const,
  },
} as const
