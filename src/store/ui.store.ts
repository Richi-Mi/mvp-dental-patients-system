import { create } from "zustand"

import { getISOWeek, nextOpenDay, startOfISOWeek, todayISO } from "@/lib/clinic-data"
import type { AppointmentStatus } from "@/types/clinic"

const current = getISOWeek(new Date())

/** Formulario de nueva cita en curso. */
export type AppointmentDraft = {
    patientId: string
    date: string
    time: string
    status: AppointmentStatus
    motivo: string
}

function emptyAppointmentDraft(): AppointmentDraft {
    return {
        patientId: "",
        date: nextOpenDay(todayISO()),
        time: "09:00",
        status: "pendiente",
        motivo: "",
    }
}

export type UiState = {
    /**
     * Semana visible en la agenda (`GET /citas?year=&week=`). `agendaYear` es el
     * **año-semana** ISO, que a inicios de enero puede diferir del año calendario.
     */
    agendaYear: number
    agendaWeek: number // 1-53
    agendaSearch: string
    /**
     * Correo del médico cuya agenda se está viendo. Solo lo usa un asistente:
     * un médico siempre ve la suya (rutas `/citas`, filtradas por el token).
     */
    agendaMedico: string | null
    patientSearch: string
    /**
     * Se conserva fuera del diálogo para que el rodeo a "Nuevo paciente"
     * (que navega a otra ruta) no borre lo que ya se había capturado.
     */
    appointmentDraft: AppointmentDraft
    setAgendaWeek: (year: number, week: number) => void
    shiftAgendaWeek: (delta: number) => void
    resetAgendaWeek: () => void
    setAgendaSearch: (value: string) => void
    setAgendaMedico: (correo: string | null) => void
    setPatientSearch: (value: string) => void
    setAppointmentDraft: (patch: Partial<AppointmentDraft>) => void
    resetAppointmentDraft: () => void
}

export const useUiStore = create<UiState>()((set) => ({
    agendaYear: current.year,
    agendaWeek: current.week,
    agendaSearch: "",
    agendaMedico: null,
    patientSearch: "",
    appointmentDraft: emptyAppointmentDraft(),

    setAgendaWeek: (agendaYear, agendaWeek) => set({ agendaYear, agendaWeek }),

    // Se navega sobre el lunes real y se recalcula la semana ISO, para que los
    // cambios de año (semana 52/53 -> 1) caigan donde deben.
    shiftAgendaWeek: (delta) =>
        set((state) => {
            const monday = startOfISOWeek(state.agendaYear, state.agendaWeek)
            const target = new Date(
                monday.getFullYear(),
                monday.getMonth(),
                monday.getDate() + delta * 7,
            )
            const { year, week } = getISOWeek(target)
            return { agendaYear: year, agendaWeek: week }
        }),

    resetAgendaWeek: () => {
        const { year, week } = getISOWeek(new Date())
        set({ agendaYear: year, agendaWeek: week })
    },

    setAgendaSearch: (agendaSearch) => set({ agendaSearch }),

    // Cambiar de médico descarta el paciente elegido (es de la cartera del
    // médico anterior); la fecha y el motivo capturados se conservan.
    setAgendaMedico: (agendaMedico) =>
        set((state) => ({
            agendaMedico,
            appointmentDraft: { ...state.appointmentDraft, patientId: "" },
        })),
    setPatientSearch: (patientSearch) => set({ patientSearch }),

    setAppointmentDraft: (patch) =>
        set((state) => ({ appointmentDraft: { ...state.appointmentDraft, ...patch } })),

    resetAppointmentDraft: () => set({ appointmentDraft: emptyAppointmentDraft() }),
}))
