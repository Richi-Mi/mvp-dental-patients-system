import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/api/client"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Los 4xx del backend (401/403/404/409) no se resuelven reintentando.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})
