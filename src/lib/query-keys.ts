import type { CitasQuery } from "@/api/types"

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    all: ["usuarios"] as const,
    list: () => ["usuarios", "list"] as const,
    detail: (correo: string) => ["usuarios", "detail", correo] as const,
  },
  patients: {
    all: ["pacientes"] as const,
    list: () => ["pacientes", "list"] as const,
    detail: (id: number) => ["pacientes", "detail", id] as const,
  },
  appointments: {
    all: ["citas"] as const,
    list: (params: CitasQuery) => ["citas", "list", params] as const,
  },
} as const
