import * as React from "react"
import {
    keepPreviousData,
    useMutation,
      useQuery,
    useQueryClient,
} from "@tanstack/react-query"

import { citasActions } from "@/actions"
import type { CitasQuery } from "@/api/types"
import {
    getISOWeek,
    isoWeekDates,
    onlyOpenDays,
    parseISO,
    todayISO,
} from "@/lib/clinic-data"
import { queryKeys } from "@/lib/query-keys"
import { useUiStore } from "@/store/ui.store"
import type { Appointment, AppointmentInput } from "@/types/clinic"
import { useActiveMedico } from "./useMedicos"

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
 *
 * `search` es el término ya confirmado por el usuario (Enter o botón "Buscar"),
 * no lo que está escribiendo: la vista guarda el borrador y llama a `setSearch`
 * solo al enviar, así que cada cambio dispara una única petición.
 *
 * Un asistente ve la agenda del médico que tenga elegido (ver
 * `useActiveMedico`): las peticiones van a `/citas/medico/:correo` en vez de
 * a `/citas`.
 */
export function useAgenda() {
    const year = useUiStore((s) => s.agendaYear)
    const week = useUiStore((s) => s.agendaWeek)
    const search = useUiStore((s) => s.agendaSearch)
    const setSearch = useUiStore((s) => s.setAgendaSearch)
    const shiftWeek = useUiStore((s) => s.shiftAgendaWeek)
    const resetWeek = useUiStore((s) => s.resetAgendaWeek)
    const setWeek = useUiStore((s) => s.setAgendaWeek)

    const {
        isAsistente,
        medicos,
        medicoEmail,
        medicoActivo,
        setMedico,
        isReady,
        isLoadingMedicos,
        medicosError,
    } = useActiveMedico()

    const queryClient = useQueryClient()

    const params: CitasQuery = React.useMemo(() => {
        const term = search.trim()
        return { year, week, ...(term ? { query: term } : {}) }
    }, [year, week, search])

    const listQuery = useQuery({
        queryKey: queryKeys.appointments.list(params, medicoEmail),
        queryFn: () => citasActions.listAppointments(params, medicoEmail),
        placeholderData: keepPreviousData,
        enabled: isReady,
    })

    const appointments = React.useMemo(
        () => [...(listQuery.data ?? [])].sort(sortByDateTime),
        [listQuery.data],
    )

    /** Los 7 días de la semana, para resaltar el rango en el calendario. */
    const weekDates = React.useMemo(() => isoWeekDates(year, week), [year, week])

    /** Las columnas visibles: solo días de atención, incluidas las vacías. */
    const weekDays: AgendaDay[] = React.useMemo(() => {
        const today = todayISO()
        const buckets = new Map<string, Appointment[]>(
            onlyOpenDays(weekDates).map((date) => [date, []]),
        )
        for (const appt of appointments) buckets.get(appt.date)?.push(appt)
        return [...buckets.entries()].map(([date, items]) => ({
            date,
            isToday: date === today,
            items,
        }))
    }, [appointments, weekDates])

    /** Días de la semana que ya tienen alguna cita. */
    const markedDates = React.useMemo(
        () => [...new Set(appointments.map((a) => a.date))],
        [appointments],
    )

    /**
     * Citas que no caben en ninguna columna visible: las de días sin atención
     * (ver `CLOSED_WEEKDAYS`) y las que el backend agrupó en otra semana por huso
     * horario. Se exponen aparte para no perderlas de vista.
     */
    const outOfWeek = React.useMemo(() => {
        const visible = new Set(weekDays.map((d) => d.date))
        return appointments.filter((a) => !visible.has(a.date))
    }, [appointments, weekDays])

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
        mutationFn: (input: AppointmentInput & { medicoEmail?: string | null }) => {
            const { medicoEmail: destino, ...cita } = input
            return citasActions.createAppointment(
                cita,
                destino === undefined ? medicoEmail : destino,
            )
        },
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
        weekDates,
        markedDates,
        outOfWeek,
        year,
        week,
        search,
        setSearch,

        /** Solo un asistente elige médico; un médico ve siempre su agenda. */
        isAsistente,
        medicos,
        medicoEmail,
        medicoActivo,
        setMedico,
        isLoadingMedicos,
        medicosError,
        goToPreviousWeek: () => shiftWeek(-1),
        goToNextWeek: () => shiftWeek(1),
        goToCurrentWeek: resetWeek,
        /** Salta a la semana que contiene la fecha indicada. */
        goToDate: (iso: string) => {
            const { year: y, week: w } = getISOWeek(parseISO(iso))
            setWeek(y, w)
        },

        // Sin médico elegido la query está deshabilitada: el spinner solo tiene
        // sentido mientras se carga la lista de médicos.
        isLoading:
            listQuery.isLoading || (isAsistente && !isReady && isLoadingMedicos),
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
