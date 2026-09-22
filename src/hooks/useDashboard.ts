import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"

import { userActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import {
  DASHBOARD_WHOLE_YEAR,
  dashboardYears,
  readDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/clinic-data"
import { queryKeys } from "@/lib/query-keys"

/**
 * Métricas del dashboard (`GET /user/dashboard`) del periodo elegido. El año y
 * el mes viven en la URL (`?year=&month=`, `month=todo` = todo el año), así que
 * se conservan al recargar y con atrás/adelante; sin ellos se ve el mes en
 * curso. El backend hace toda la agregación: una sola petición por periodo.
 */
export function useDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const period = readDashboardPeriod(searchParams)

  const query = useQuery({
    queryKey: queryKeys.dashboard.byPeriod(period.year, period.month),
    queryFn: () =>
      userActions.getDashboard({
        year: period.year,
        month: period.month ?? undefined,
      }),
    // Al cambiar de periodo se siguen viendo las cifras anteriores (la vista
    // las atenúa con `isPlaceholderData`) en lugar de "—" mientras carga.
    placeholderData: keepPreviousData,
  })

  // Se parte de los parámetros actuales para no perder otros de la URL.
  function setPeriod(next: DashboardPeriod) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set("year", String(next.year))
      params.set(
        "month",
        next.month === null ? DASHBOARD_WHOLE_YEAR : String(next.month),
      )
      return params
    })
  }

  return {
    period,
    years: dashboardYears(),
    setPeriod,
    metrics: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    // Sin conexión se siguen viendo las últimas cifras cargadas en vez de un
    // error de fondo (ver el mismo criterio en `useAgenda`/`usePatients`).
    error: isNetworkError(query.error) ? undefined : query.error,
    refetch: query.refetch,
  }
}
