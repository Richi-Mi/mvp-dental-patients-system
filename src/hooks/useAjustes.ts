import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ajustesActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import type { UpdateAjustesPayload } from "@/api/types"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/store/auth.store"

/**
 * Ajustes del médico guardados en el servidor (`/ajustes`, solo rol
 * `medico`). Guardar necesita conexión: no pasa por la cola sin conexión,
 * igual que la administración de asistentes (`useUsers`).
 */
export function useAjustes() {
  const isMedico = useAuthStore((s) => s.usuario?.tipo === "medico")
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.ajustes.all,
    queryFn: ajustesActions.getAjustes,
    enabled: isMedico,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateAjustesPayload) =>
      ajustesActions.updateAjustes(payload),
    onSuccess: ({ ajustes, citasCompletadas }) => {
      queryClient.setQueryData(queryKeys.ajustes.all, ajustes)
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
