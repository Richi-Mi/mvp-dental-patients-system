"use client"

import * as React from "react"
import {
  initialAppointments,
  initialPatients,
  parseISO,
  type Appointment,
  type Patient,
  type Treatment,
} from "./../lib/clinic-data"

type NewAppointmentInput = Omit<Appointment, "id">
type NewTreatmentInput = Omit<Treatment, "id">

type ClinicContextValue = {
  patients: Patient[]
  appointments: Appointment[]
  getPatient: (id: string) => Patient | undefined
  getNextAppointment: (patientId: string) => Appointment | undefined
  addAppointment: (input: NewAppointmentInput) => void
  addTreatment: (patientId: string, input: NewTreatmentInput) => void
  addPatient: (name: string) => string
  updatePatient: (id: string, patch: Partial<Omit<Patient, "id" | "treatments">>) => void
}

const ClinicContext = React.createContext<ClinicContextValue | null>(null)

/** Reference "today" for the seeded dataset. */
const TODAY = "2026-08-04"

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = React.useState<Patient[]>(initialPatients)
  const [appointments, setAppointments] =
    React.useState<Appointment[]>(initialAppointments)

  const getPatient = React.useCallback(
    (id: string) => patients.find((p) => p.id === id),
    [patients],
  )

  const getNextAppointment = React.useCallback(
    (patientId: string) => {
      const today = parseISO(TODAY).getTime()
      return appointments
        .filter(
          (a) =>
            a.patientId === patientId &&
            parseISO(a.date).getTime() >= today &&
            a.status !== "cancelada" &&
            a.status !== "completada",
        )
        .sort((a, b) =>
          a.date === b.date
            ? a.time.localeCompare(b.time)
            : a.date.localeCompare(b.date),
        )[0]
    },
    [appointments],
  )

  const addAppointment = React.useCallback((input: NewAppointmentInput) => {
    setAppointments((prev) => [...prev, { ...input, id: uid("a") }])
  }, [])

  const addTreatment = React.useCallback(
    (patientId: string, input: NewTreatmentInput) => {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patientId
            ? { ...p, treatments: [...p.treatments, { ...input, id: uid("t") }] }
            : p,
        ),
      )
    },
    [],
  )

  const addPatient = React.useCallback((name: string) => {
    const id = uid("p")
    setPatients((prev) => [
      ...prev,
      {
        id,
        name,
        age: 0,
        gender: "Femenino",
        phone: "",
        email: "",
        address: "",
        notes: "",
        treatments: [],
      },
    ])
    return id
  }, [])

  const updatePatient = React.useCallback(
    (id: string, patch: Partial<Omit<Patient, "id" | "treatments">>) => {
      setPatients((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      )
    },
    [],
  )

  const value = React.useMemo<ClinicContextValue>(
    () => ({
      patients,
      appointments,
      getPatient,
      getNextAppointment,
      addAppointment,
      addTreatment,
      addPatient,
      updatePatient,
    }),
    [
      patients,
      appointments,
      getPatient,
      getNextAppointment,
      addAppointment,
      addTreatment,
      addPatient,
      updatePatient,
    ],
  )

  return (
    <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
  )
}

export function useClinic() {
  const ctx = React.useContext(ClinicContext)
  if (!ctx) {
    throw new Error("useClinic must be used within a ClinicProvider")
  }
  return ctx
}

export { TODAY }
