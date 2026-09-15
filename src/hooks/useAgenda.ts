import * as React from "react"
import {
    keepPreviousData,
    useMutation,
      useQuery,
    useQueryClient,
} from "@tanstack/react-query"
import { useSearchParams } from "react-router"

import { citasActions } from "@/actions"
import type { CitasQuery } from "@/api/types"
import {
    getISOWeek,
    isoWeekDates,
    onlyOpenDays,
    parseISO,
    startOfISOWeek,
    toISODateString,
    todayISO,
} from "@/lib/clinic-data"
import { queryKeys } from "@/lib/query-keys"
import type { Appointment, AppointmentInput } from "@/types/clinic"
import { useActiveMedico } from "./useMedicos"

/** Parámetros de la URL que controla la agenda. */
const AGENDA_PARAMS = ["year", "week", "day", "term"] as const

/** `?day=yyyy-mm-dd` si es una fecha real (descarta `2026-02-31`, etc.). */
function readDay(params: URLSearchParams): string | null {
    const day = params.get("day")
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
    return toISODateString(parseISO(day)) === day ? day : null
}

/**
 * Semana ISO de la URL (`?year=&week=`). Si falta o no es válida se toma la
 * de `?day=` y, sin él, la semana actual; una semana inexistente (la 53 de un
 * año que solo tiene 52) se normaliza a la que realmente cae.
 */
function readWeek(
    params: URLSearchParams,
    day: string | null,
): { year: number; week: number } {
    const year = Number(params.get("year"))
    const week = Number(params.get("week"))
    const valid =
        Number.isInteger(year) &&
        Number.isInteger(week) &&
        year >= 1970 &&
        year <= 9999 &&
        week >= 1 &&
        week <= 53
    if (valid) return getISOWeek(startOfISOWeek(year, week))
    return getISOWeek(day ? parseISO(day) : new Date())
}

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
 * Agenda semanal del médico autenticado (`/citas`). La semana ISO, el día
 * elegido (vista de teléfono) y la búsqueda viven en la URL
 * (`?year=&week=&day=&term=`), así que se pueden compartir, recargar y
 * recorrer con atrás/adelante; el backend filtra por semana y búsqueda.
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
    const [searchParams, setSearchParams] = useSearchParams()
    const day = readDay(searchParams)
    const { year, week } = readWeek(searchParams, day)
    const search = searchParams.get("term") ?? ""

    const current = getISOWeek(new Date())
    const isCurrentWeek = year === current.year && week === current.week

    // Se parte de los parámetros actuales para no perder los ajenos a la
    // agenda (p. ej. `?cita=nueva` del diálogo).
    const updateParams = React.useCallback(
        (patch: Record<string, string | null>) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                for (const [key, value] of Object.entries(patch)) {
                    if (value) next.set(key, value)
                    else next.delete(key)
                }
                return next
            })
        },
        [setSearchParams],
    )

    // Cambiar de semana descarta el día elegido: ya no pertenece a ella.
    const setWeek = React.useCallback(
        (y: number, w: number) =>
            updateParams({ year: String(y), week: String(w), day: null }),
        [updateParams],
    )

    /** Elige un día y, en el mismo cambio de URL, la semana que lo contiene. */
    const selectDay = React.useCallback(
        (iso: string) => {
            const target = getISOWeek(parseISO(iso))
            updateParams({
                year: String(target.year),
                week: String(target.week),
                day: iso,
            })
        },
        [updateParams],
    )

    const setSearch = React.useCallback(
        (value: string) => updateParams({ term: value.trim() || null }),
        [updateParams],
    )

    /** Quita semana, día y búsqueda: vuelve a hoy / la semana actual. */
    const clearFilters = React.useCallback(
        () =>
            updateParams(
                Object.fromEntries(AGENDA_PARAMS.map((key) => [key, null])),
            ),
        [updateParams],
    )

    // Se navega sobre el lunes real y se recalcula la semana ISO, para que los
    // cambios de año (semana 52/53 -> 1) caigan donde deben.
    const shiftWeek = (delta: number) => {
        const monday = startOfISOWeek(year, week)
        const target = getISOWeek(
            new Date(
                monday.getFullYear(),
                monday.getMonth(),
                monday.getDate() + delta * 7,
            ),
        )
        setWeek(target.year, target.week)
    }

    const resetWeek = () => setWeek(current.year, current.week)

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

    /**
     * Día que se muestra en la vista de teléfono: el de `?day=` si cae en la
     * semana visible; si no, hoy o, en su defecto, el primer día de atención.
     */
    const selectedDay: AgendaDay | undefined =
        weekDays.find((d) => d.date === day) ??
        weekDays.find((d) => d.isToday) ??
        weekDays[0]

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
        (patientId?: number) =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
                patientId != null &&
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.patients.detail(patientId),
                    }),
            ]),
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
        onSuccess: (appt) => {
            invalidate(appt.patientId)
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, input }: { id: string; input: Partial<AppointmentInput> }) =>
            citasActions.updateAppointment(id, input),
        // Se espera al refetch: así la mutación no termina antes de que la
        // agenda tenga el dato nuevo y el selector de estatus no "regresa" un
        // instante al valor anterior.
        onSuccess: (appt) => invalidate(appt.patientId),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => citasActions.deleteAppointment(id),
        onSuccess: () => {
            invalidate()
        },
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
        isCurrentWeek,
        /** Día que pide la URL (`?day=`), aunque no caiga en la semana visible. */
        dayParam: day,
        selectedDay,
        selectDay,
        clearFilters,

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
        updateError: updateMutation.error,

        deleteAppointment: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    }
}
