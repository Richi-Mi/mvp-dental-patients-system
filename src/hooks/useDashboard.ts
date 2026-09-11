import { useQuery } from "@tanstack/react-query"

import { userActions } from "@/actions"
import { queryKeys } from "@/lib/query-keys"

/**
 * Métricas del dashboard (`GET /user/dashboard`). El backend hace toda la
 * agregación, así que es una sola petición por año.
 */
export function useDashboard(year: number) {
  const query = useQuery({
    queryKey: queryKeys.dashboard.byYear(year),
    queryFn: () => userActions.getDashboard(year),
  })

  return {
    metrics: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
