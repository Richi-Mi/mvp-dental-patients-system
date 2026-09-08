import { create } from "zustand"

import { getISOWeek, startOfISOWeek } from "@/lib/clinic-data"

const current = getISOWeek(new Date())

export type UiState = {
  /**
   * Semana visible en la agenda (`GET /citas?year=&week=`). `agendaYear` es el
   * **año-semana** ISO, que a inicios de enero puede diferir del año calendario.
   */
  agendaYear: number
  agendaWeek: number // 1-53
  agendaSearch: string
  patientSearch: string
  setAgendaWeek: (year: number, week: number) => void
  shiftAgendaWeek: (delta: number) => void
  resetAgendaWeek: () => void
  setAgendaSearch: (value: string) => void
  setPatientSearch: (value: string) => void
}

export const useUiStore = create<UiState>()((set) => ({
  agendaYear: current.year,
  agendaWeek: current.week,
  agendaSearch: "",
  patientSearch: "",

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
  setPatientSearch: (patientSearch) => set({ patientSearch }),
}))
