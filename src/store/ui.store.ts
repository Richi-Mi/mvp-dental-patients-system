import { create } from "zustand"

import { nextOpenDay, todayISO } from "@/lib/clinic-data"
import type { AppointmentStatus } from "@/types/clinic"

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
        time: "10:00",
        status: "confirmada",
        motivo: "",
    }
}

export type UiState = {
    // La semana y la búsqueda de la agenda viven en la URL (ver `useAgenda`).
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
    setAgendaMedico: (correo: string | null) => void
    setPatientSearch: (value: string) => void
    setAppointmentDraft: (patch: Partial<AppointmentDraft>) => void
    resetAppointmentDraft: () => void
}

export const useUiStore = create<UiState>()((set) => ({
    agendaMedico: null,
    patientSearch: "",
    appointmentDraft: emptyAppointmentDraft(),

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
