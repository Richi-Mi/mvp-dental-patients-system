import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { diasInactivosActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import { withInactiveDay } from "@/lib/clinic-data"
import { queryKeys } from "@/lib/query-keys"

/** Referencia estable para cuando todavía no hay datos. */
const NO_DAYS: string[] = []

type SetInactiveDayVars = {
  date: string
  inactive: boolean
  /** De qué agenda es el día; va en las variables por si cambia el médico a medio guardar. */
  medicoEmail: string | null
}

/**
 * Días inactivos (`yyyy-mm-dd`) de una agenda: la propia (`medicoEmail`
 * `null`) o la del médico que ve un asistente. Lo usa `useAgenda`, que ya
 * resuelve de quién es la agenda.
 *
 * Marcar o desmarcar necesita conexión: no pasa por la cola sin conexión,
 * igual que los ajustes (`useAjustes`). El cambio se ve antes de que responda
 * el servidor y se deshace si falla. La lista sí se guarda con la caché, así
 * que sin conexión los días siguen en rojo y bloqueados.
 */
export function useInactiveDays(medicoEmail: string | null, enabled: boolean) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.inactiveDays.list(medicoEmail),
    queryFn: () => diasInactivosActions.listInactiveDays(medicoEmail),
    enabled,
  })

  const inactiveDays: ReadonlySet<string> = new Set(query.data ?? NO_DAYS)

  const mutation = useMutation({
    mutationFn: ({ date, inactive, medicoEmail }: SetInactiveDayVars) =>
      diasInactivosActions.setInactiveDay(date, inactive, medicoEmail),
    onMutate: async ({ date, inactive, medicoEmail }) => {
      const key = queryKeys.inactiveDays.list(medicoEmail)
      // Una lectura en curso pisaría el cambio con la lista anterior.
      await queryClient.cancelQueries({ queryKey: key })
      const wasInactive =
        queryClient.getQueryData<string[]>(key)?.includes(date) ?? false
      queryClient.setQueryData<string[]>(key, (current) =>
        withInactiveDay(current ?? NO_DAYS, date, inactive),
      )
      return { wasInactive }
    },
    // Solo se deshace ese día: si otro se guardó al mismo tiempo, se queda.
    onError: (_error, { date, medicoEmail }, context) => {
      if (!context) return
      queryClient.setQueryData<string[]>(
        queryKeys.inactiveDays.list(medicoEmail),
        (current) => withInactiveDay(current ?? NO_DAYS, date, context.wasInactive),
      )
    },
    onSettled: (_data, _error, { medicoEmail }) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.inactiveDays.list(medicoEmail),
      }),
  })

  return {
    inactiveDays,
    isDayInactive: (date: string) => inactiveDays.has(date),
    /** Marca (`true`) o vuelve a activar (`false`) el día. Rechaza si falla. */
    setDayInactive: (date: string, inactive: boolean) =>
      mutation.mutateAsync({ date, inactive, medicoEmail }),
    isUpdating: mutation.isPending,
    // Sin conexión se siguen usando los últimos días cargados.
    error: isNetworkError(query.error) ? undefined : query.error,
  }
}
