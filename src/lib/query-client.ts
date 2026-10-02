import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/api/client"

/** Lo que dura la caché guardada en IndexedDB (ver `lib/query-persister.ts`). */
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Sin conexión los datos ya cargados siguen en pantalla: se conservan
      // aunque nadie los use un rato (p. ej. al ir a Pacientes y volver). No
      // puede ser menor que `CACHE_MAX_AGE`, o se borrarían de la caché
      // guardada antes de tiempo.
      gcTime: CACHE_MAX_AGE,
      refetchOnWindowFocus: false,
      // Los 4xx del backend (401/403/404/409) no se resuelven reintentando.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
      // Con el modo "online" (el de fábrica) una mutación sin conexión se
      // queda en pausa y el formulario esperaría indefinidamente. Así corre
      // siempre y `saveOrQueue` decide si guardarla en la cola sin conexión.
      networkMode: "always",
    },
  },
})
