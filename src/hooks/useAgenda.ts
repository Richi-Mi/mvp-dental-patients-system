import * as React from "react"
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { citasActions } from "@/actions"
import type { CitasQuery } from "@/api/types"
import { isoWeekDates, todayISO } from "@/lib/clinic-data"
import { queryKeys } from "@/lib/query-keys"
import { useUiStore } from "@/store/ui.store"
import type { Appointment, AppointmentInput } from "@/types/clinic"
import { useDebouncedValue } from "./useDebouncedValue"

function sortByDateTime(a: Appointment, b: Appointment) {
  return a.date === b.date
    ? a.time.localeCompare(b.time)
    : a.date.localeCompare(b.date)
}

export type AgendaDay = {
  /** `yyyy-mm-dd` */
  date: string
  isToday: boolean
  items: Appointment[]
}

/**
 * Agenda semanal del médico autenticado (`/citas`). La semana ISO y la
 * búsqueda viven en el store de Zustand; el backend filtra por ambas.
 */
export function useAgenda() {
  const year = useUiStore((s) => s.agendaYear)
  const week = useUiStore((s) => s.agendaWeek)
  const search = useUiStore((s) => s.agendaSearch)
  const setSearch = useUiStore((s) => s.setAgendaSearch)
  const shiftWeek = useUiStore((s) => s.shiftAgendaWeek)
  const resetWeek = useUiStore((s) => s.resetAgendaWeek)

  const debouncedSearch = useDebouncedValue(search)
  const queryClient = useQueryClient()

  const params: CitasQuery = React.useMemo(() => {
    const term = debouncedSearch.trim()
    return { year, week, ...(term ? { query: term } : {}) }
  }, [year, week, debouncedSearch])

  const listQuery = useQuery({
    queryKey: queryKeys.appointments.list(params),
    queryFn: () => citasActions.listAppointments(params),
    placeholderData: keepPreviousData,
  })

  const appointments = React.useMemo(
    () => [...(listQuery.data ?? [])].sort(sortByDateTime),
    [listQuery.data],
  )

  /** Las 7 columnas (lunes a domingo), incluidas las vacías. */
  const weekDays: AgendaDay[] = React.useMemo(() => {
    const today = todayISO()
    const buckets = new Map<string, Appointment[]>(
      isoWeekDates(year, week).map((date) => [date, []]),
    )
    for (const appt of appointments) buckets.get(appt.date)?.push(appt)
    return [...buckets.entries()].map(([date, items]) => ({
      date,
      isToday: date === today,
      items,
    }))
  }, [appointments, year, week])

  /**
   * El backend agrupa por su propio huso: una cita de madrugada puede caer en
   * un día local fuera de estas 7 columnas. Se exponen aparte para no perderla.
   */
  const outOfWeek = React.useMemo(() => {
    const dates = new Set(isoWeekDates(year, week))
    return appointments.filter((a) => !dates.has(a.date))
  }, [appointments, year, week])

  const invalidate = React.useCallback(
    (patientId?: number) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      if (patientId != null) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.patients.detail(patientId),
        })
      }
    },
    [queryClient],
  )

  const createMutation = useMutation({
    mutationFn: (input: AppointmentInput) =>
      citasActions.createAppointment(input),
    onSuccess: (appt) => invalidate(appt.patientId),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AppointmentInput> }) =>
      citasActions.updateAppointment(id, input),
    onSuccess: (appt) => invalidate(appt.patientId),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => citasActions.deleteAppointment(id),
    onSuccess: () => invalidate(),
  })

  return {
    appointments,
    weekDays,
    outOfWeek,
    year,
    week,
    search,
    setSearch,
    goToPreviousWeek: () => shiftWeek(-1),
    goToNextWeek: () => shiftWeek(1),
    goToCurrentWeek: resetWeek,

    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    refetch: listQuery.refetch,

    createAppointment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateAppointment: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteAppointment: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/** Las 12 llamadas mensuales que necesita el dashboard para un año. */
export function useAgendaYear(year: number) {
  const results = useQueries({
    queries: MONTHS.map((month) => ({
      queryKey: queryKeys.appointments.list({ year, month }),
      queryFn: () => citasActions.listAppointments({ year, month }),
      staleTime: 60_000,
    })),
  })

  const appointments = React.useMemo(
    () => results.flatMap((r) => r.data ?? []).sort(sortByDateTime),
    [results],
  )

  return {
    appointments,
    isLoading: results.some((r) => r.isLoading),
    error: results.find((r) => r.error)?.error ?? null,
  }
}
