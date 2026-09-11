import * as React from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { pacientesActions } from "@/actions"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/store/auth.store"
import { useUiStore } from "@/store/ui.store"
import type { Patient, PatientInput, Treatment } from "@/types/clinic"
import { useActiveMedico } from "./useMedicos"

/** Referencia estable para evitar recalcular memos en cada render. */
const NO_PATIENTS: Patient[] = []

/**
 * Listado de pacientes del médico autenticado (`/pacientes`) + mutaciones.
 * El buscador es local: el endpoint de listado no recibe filtros.
 *
 * Un asistente no tiene pacientes propios: ve los del médico que tenga
 * elegido (`?correo_medico=`), el mismo de la agenda.
 */
export function usePatients() {
  const search = useUiStore((s) => s.patientSearch)
  const setSearch = useUiStore((s) => s.setPatientSearch)
  const propio = useAuthStore((s) => s.usuario?.correo ?? null)
  const { medicoEmail, isReady } = useActiveMedico()
  const queryClient = useQueryClient()

  // A quién se asignan los pacientes nuevos: al médico elegido o a uno mismo.
  const correoMedico = medicoEmail ?? propio

  const listQuery = useQuery({
    queryKey: queryKeys.patients.list(medicoEmail),
    queryFn: () => pacientesActions.listPatients(medicoEmail),
    enabled: isReady,
  })

  const patients = listQuery.data ?? NO_PATIENTS

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return patients
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.phone.toLowerCase().includes(term),
    )
  }, [patients, search])

  const invalidate = React.useCallback(
    (id?: number) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all })
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(id) })
      }
    },
    [queryClient],
  )

  const createMutation = useMutation({
    // Sin `correo_medico` el paciente queda huérfano y `GET /pacientes`
    // (que filtra por el médico del token) no lo devolvería.
    mutationFn: (input: PatientInput & { medicoEmail?: string | null }) =>
      pacientesActions.createPatient({
        medicoEmail: correoMedico,
        ...input,
      }),
    onSuccess: (patient) => {
      // Se agrega al listado en el acto para que quien navegue de vuelta
      // (p. ej. el diálogo de nueva cita) ya lo encuentre seleccionable.
      queryClient.setQueryData<Patient[]>(
        queryKeys.patients.list(medicoEmail),
        (prev) => (prev ? [...prev, patient] : [patient]),
      )
      invalidate(patient.id)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number
      input: Partial<PatientInput> & { treatments?: Treatment[] }
    }) => pacientesActions.updatePatient(id, input),
    onSuccess: (patient) => invalidate(patient.id),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pacientesActions.deletePatient(id),
    onSuccess: (patient) => invalidate(patient.id),
  })

  return {
    patients,
    filtered,
    search,
    setSearch,
    /** Médico dueño de estos pacientes (`null` = el usuario autenticado). */
    medicoEmail,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    refetch: listQuery.refetch,

    createPatient: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updatePatient: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deletePatient: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}

/**
 * Expediente completo (`GET /pacientes/:id`): incluye `tratamientos` y
 * `proximasCitas`.
 *
 * `PUT /pacientes/:id` **reemplaza** la lista de tratamientos completa, así
 * que las mutaciones de tratamientos parten siempre de la lista actual.
 */
export function usePatient(id: number | undefined) {
  const enabled = typeof id === "number" && Number.isFinite(id)
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: queryKeys.patients.detail(id ?? -1),
    queryFn: () => pacientesActions.getPatient(id as number),
    enabled,
  })

  const patient = detailQuery.data

  const onPatientChange = React.useCallback(() => {
    if (!enabled) return
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(id!) })
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.list() })
  }, [enabled, id, queryClient])

  /**
   * Envía la lista final completa: `PUT /pacientes/:id` reemplaza todos los
   * tratamientos guardados, no los actualiza uno por uno.
   */
  const saveTreatmentsMutation = useMutation({
    mutationFn: (treatments: Treatment[]) =>
      pacientesActions.updatePatient(id as number, { treatments }),
    onSuccess: onPatientChange,
  })

  const updateMutation = useMutation({
    mutationFn: (input: Partial<PatientInput>) =>
      pacientesActions.updatePatient(id as number, input),
    onSuccess: onPatientChange,
  })

  return {
    patient,
    treatments: patient?.treatments ?? [],
    upcoming: patient?.upcoming ?? [],
    nextAppointment: patient?.upcoming?.[0],
    isLoading: detailQuery.isLoading,
    isFetching: detailQuery.isFetching,
    error: detailQuery.error,

    updatePatient: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    saveTreatments: saveTreatmentsMutation.mutateAsync,
    isSavingTreatments: saveTreatmentsMutation.isPending,
    saveTreatmentsError: saveTreatmentsMutation.error,
  }
}
