import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ajustesActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import { DEFAULT_WORKING_HOURS } from "@/lib/clinic-data"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/store/auth.store"
import type { Ajustes, WorkingHours } from "@/types/clinic"

/** Los valores de `ajustes` en las llaves que trae `changes`. */
function pick(ajustes: Ajustes, changes: Partial<Ajustes>): Partial<Ajustes> {
  return Object.fromEntries(
    Object.keys(changes).map((key) => [key, ajustes[key as keyof Ajustes]]),
  )
}

/**
 * Ajustes del usuario con sesión (médico o asistente) guardados en el
 * servidor (`/ajustes`). Guardar necesita conexión: no pasa por la cola sin
 * conexión, igual que la administración de asistentes (`useUsers`).
 *
 * Al guardar, el cambio se ve antes de que responda el servidor y se deshace
 * si falla. Cada llamada al hook tiene su propia mutación, así que
 * `isUpdating` es solo de lo que guarda ese componente.
 */
export function useAjustes() {
  const hasSession = useAuthStore((s) => s.usuario !== null)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.ajustes.all,
    queryFn: ajustesActions.getAjustes,
    enabled: hasSession,
  })

  const updateMutation = useMutation({
    mutationFn: (changes: Partial<Ajustes>) => ajustesActions.updateAjustes(changes),
    onMutate: async (changes) => {
      // Una lectura en curso pisaría el valor nuevo con el anterior.
      await queryClient.cancelQueries({ queryKey: queryKeys.ajustes.all })
      const previous = queryClient.getQueryData<Ajustes>(queryKeys.ajustes.all)
      if (previous) {
        queryClient.setQueryData<Ajustes>(queryKeys.ajustes.all, {
          ...previous,
          ...changes,
        })
      }
      // Solo lo que cambió: si otro ajuste se guarda al mismo tiempo, deshacer
      // este no se lleva el otro.
      return { rollback: previous ? pick(previous, changes) : undefined }
    },
    onError: (_error, _changes, context) => {
      if (!context?.rollback) return
      queryClient.setQueryData<Ajustes>(queryKeys.ajustes.all, (current) =>
        current ? { ...current, ...context.rollback } : current,
      )
    },
    onSuccess: ({ ajustes, citasCompletadas }, changes) => {
      queryClient.setQueryData<Ajustes>(queryKeys.ajustes.all, (current) =>
        current ? { ...current, ...pick(ajustes, changes) } : ajustes,
      )
      // Al activar el autocompletado el backend ya cambió citas: la agenda y
      // el dashboard que estén en caché quedaron viejos.
      if (citasCompletadas > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.all,
        })
        void queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.all,
        })
      }
    },
  })

  return {
    ajustes: query.data,
    isLoading: query.isLoading,
    // Sin conexión se siguen viendo los últimos ajustes cargados.
    error: isNetworkError(query.error) ? undefined : query.error,
    refetch: query.refetch,

    updateAjustes: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}

/**
 * Horario de atención del usuario con sesión: las filas de la agenda y el
 * rango de horas del diálogo de cita. Mientras sus ajustes no cargan (o sin
 * conexión y sin caché), el de por defecto.
 */
export function useWorkingHours(): WorkingHours {
  const { ajustes } = useAjustes()
  return ajustes?.workingHours ?? DEFAULT_WORKING_HOURS
}
