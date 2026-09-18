import type { CitasQuery } from "@/api/types"

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
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
  appointments: {
    all: ["citas"] as const,
    list: (params: CitasQuery, medicoEmail?: string | null) =>
      ["citas", "list", medicoEmail ?? "propio", params] as const,
  },
} as const
