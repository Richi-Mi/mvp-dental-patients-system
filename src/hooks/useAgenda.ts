import * as React from "react"
import {
    keepPreviousData,
    useMutation,
      useQuery,
    useQueryClient,
} from "@tanstack/react-query"
import { useSearchParams } from "react-router"

import { citasActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import type { CitasQuery } from "@/api/types"
import {
    getISOWeek,
    inactiveDayMessage,
    isoWeekDates,
    onlyOpenDays,
    parseISO,
    startOfISOWeek,
    toISODateString,
    todayISO,
} from "@/lib/clinic-data"
import {
    agendaScope,
    applyToAppointments,
    citaIdFor,
    findConflict,
    timeConflictMessage,
    type AppointmentSlot,
} from "@/lib/offline-queue"
import { queryKeys } from "@/lib/query-keys"
import { saveOrQueue } from "@/lib/save-or-queue"
import { useAuthStore } from "@/store/auth.store"
import type { Appointment, AppointmentInput } from "@/types/clinic"
import { useActiveMedico } from "./useMedicos"
import { useInactiveDays } from "./useInactiveDays"
import { useOwnPendingOperations } from "./useOwnPendingOperations"

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
    /** Marcado como inactivo: no se agenda ahí (ver `useInactiveDays`). */
    isInactive: boolean
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
 *
 * Sin conexión, las mutaciones se guardan en la cola de `store/offline.store`
 * (ver `lib/save-or-queue.ts`) y esta agenda las muestra de inmediato
 * combinándolas con lo último que trajo el servidor (`applyToAppointments`).
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
    const owner = useAuthStore((s) => s.usuario?.correo)
    const ownPending = useOwnPendingOperations()

    const {
        inactiveDays,
        isDayInactive,
        setDayInactive,
        isUpdating: isUpdatingDay,
    } = useInactiveDays(medicoEmail, isReady)

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

    const appointments = React.useMemo(() => {
        const scope = agendaScope(owner ?? "", medicoEmail, params)
        const merged = applyToAppointments(listQuery.data ?? [], ownPending, scope)
        return [...merged].sort(sortByDateTime)
    }, [listQuery.data, ownPending, owner, medicoEmail, params])

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
            isInactive: inactiveDays.has(date),
            items,
        }))
    }, [appointments, weekDates, inactiveDays])

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

    /**
     * Otra cita de la agenda cuyo horario se empalma con `slot`, si la hay;
     * `current` es la cita que se edita (ver `findConflict`). El backend
     * también la rechaza (409), al crear y al mover; esto avisa antes de
     * guardar y antes de encolar un cambio sin conexión. Solo conoce la semana
     * cargada: un choque en otra semana lo detecta el servidor.
     */
    const findTimeConflict = (slot: AppointmentSlot, current?: Appointment) =>
        findConflict(appointments, slot, current)

    const invalidate = React.useCallback(
        (patientId?: number) =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
                // El dashboard cuenta las citas por mes y por estatus.
                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
                patientId != null &&
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.patients.detail(patientId),
                    }),
            ]),
        [queryClient],
    )

    const createMutation = useMutation({
        mutationFn: (
            input: AppointmentInput & { medicoEmail?: string | null; patientName?: string },
        ) => {
            const { medicoEmail: destino, patientName, ...cita } = input
            const target = destino === undefined ? medicoEmail : destino
            const medicoCorreo = target ?? medicoActivo?.correo ?? owner ?? ""

            return saveOrQueue({
                send: () => citasActions.createAppointment(cita, target),
                op: {
                    type: "cita.create",
                    citaId: citaIdFor(medicoCorreo, cita.date, cita.time),
                    medicoCorreo,
                    viaMedico: target != null,
                    input: cita,
                    subject: patientName ?? "",
                },
                // Sin conexión no hay servidor que rechace un horario que se
                // empalma con otra cita (409): se avisa aquí, contra lo que ya
                // se conoce de esta agenda, para no encolar una cita que de
                // todos modos no se va a poder crear. `validate` corre justo antes de encolar
                // (offline de entrada, o porque el intento real acaba de
                // fallar por red), así que cubre ambos casos. Lo mismo con un
                // día inactivo (400 en el backend).
                validate: () => {
                    if (isDayInactive(cita.date)) {
                        throw new Error(inactiveDayMessage(cita.date))
                    }
                    const conflict = findConflict(appointments, cita)
                    if (conflict) throw new Error(timeConflictMessage(conflict))
                },
                optimistic: () => ({
                    id: citaIdFor(medicoCorreo, cita.date, cita.time),
                    patientId: cita.patientId,
                    patientName: patientName ?? "",
                    date: cita.date,
                    time: cita.time,
                    endTime: cita.endTime,
                    status: cita.status,
                    motivo: cita.motivo,
                }),
            })
        },
        onSuccess: (appt) => {
            invalidate(appt.patientId)
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({
            id,
            input,
            patientName,
        }: {
            id: string
            input: Partial<AppointmentInput>
            /** Nombre del paciente resultante; solo hace falta si el cambio lo reasigna. */
            patientName?: string
        }) => {
            const current = appointments.find((a) => a.id === id)
            const subject = patientName ?? current?.patientName ?? ""

            return saveOrQueue({
                send: () => citasActions.updateAppointment(id, input, medicoEmail),
                op: {
                    type: "cita.update",
                    citaId: id,
                    input,
                    subject,
                    ...(medicoEmail ? { medicoCorreo: medicoEmail } : {}),
                },
                // Igual que al crear (ver el comentario en `createMutation`):
                // el choque solo se revisa si cambia el horario o se reactiva
                // una cita cancelada (`findConflict`), y el día inactivo solo
                // si la mueve a otro día: la que ya estaba ahí se puede seguir
                // editando, como en el backend.
                validate: () => {
                    if (!current) return
                    const next = { ...current, ...input }
                    if (next.date !== current.date && isDayInactive(next.date)) {
                        throw new Error(inactiveDayMessage(next.date))
                    }
                    const conflict = findConflict(appointments, next, current)
                    if (conflict) throw new Error(timeConflictMessage(conflict))
                },
                optimistic: () => {
                    if (!current) throw new Error("Cita no encontrada")
                    return { ...current, ...input, patientName: subject || current.patientName }
                },
            })
        },
        // Se espera al refetch: así la mutación no termina antes de que la
        // agenda tenga el dato nuevo y el selector de estatus no "regresa" un
        // instante al valor anterior.
        onSuccess: (appt) => invalidate(appt.patientId),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => {
            const current = appointments.find((a) => a.id === id)
            return saveOrQueue({
                send: () => citasActions.deleteAppointment(id, medicoEmail),
                op: {
                    type: "cita.delete",
                    citaId: id,
                    subject: current?.patientName ?? "",
                    ...(medicoEmail ? { medicoCorreo: medicoEmail } : {}),
                },
                optimistic: () => ({ message: "Cita eliminada" }),
            })
        },
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
        findTimeConflict,

        /** Días inactivos de esta agenda (la propia o la del médico elegido). */
        isDayInactive,
        setDayInactive,
        isUpdatingDay,

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
        // Sin conexión, un refetch de fondo que falla no debe tapar la agenda
        // ya cargada (y, con los cambios pendientes, ya actualizada) con un
        // error: para eso está el botón de sincronización.
        error: isNetworkError(listQuery.error) ? undefined : listQuery.error,
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
