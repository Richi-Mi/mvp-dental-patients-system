import * as React from "react"
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { pacientesActions } from "@/actions"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/store/auth.store"
import { useUiStore } from "@/store/ui.store"
import type { Patient, PatientInput, Treatment, TreatmentInput } from "@/types/clinic"

/** Referencia estable para evitar recalcular memos en cada render. */
const NO_PATIENTS: Patient[] = []

/**
 * Listado de pacientes del médico autenticado (`/pacientes`) + mutaciones.
 * El buscador es local: el endpoint de listado no recibe filtros.
 */
export function usePatients() {
  const search = useUiStore((s) => s.patientSearch)
  const setSearch = useUiStore((s) => s.setPatientSearch)
  const correoMedico = useAuthStore((s) => s.usuario?.correo ?? null)
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.patients.list(),
    queryFn: pacientesActions.listPatients,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.list() })
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
    onSuccess: (patient) => invalidate(patient.id),
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

  /** Envía la lista final completa de tratamientos. */
  const saveTreatmentsMutation = useMutation({
    mutationFn: (treatments: Treatment[]) =>
      pacientesActions.updatePatient(id as number, { treatments }),
    onSuccess: onPatientChange,
  })

  const currentTreatments = React.useCallback(async (): Promise<Treatment[]> => {
    if (patient) return patient.treatments
    const fresh = await queryClient.fetchQuery({
      queryKey: queryKeys.patients.detail(id as number),
      queryFn: () => pacientesActions.getPatient(id as number),
    })
    return fresh.treatments
  }, [patient, queryClient, id])

  const addTreatmentMutation = useMutation({
    mutationFn: async (input: TreatmentInput) => {
      const treatments = await currentTreatments()
      return pacientesActions.updatePatient(id as number, {
        treatments: [...treatments, { ...input, id: "" }],
      })
    },
    onSuccess: onPatientChange,
  })

  const removeTreatmentMutation = useMutation({
    mutationFn: async (treatmentId: string) => {
      const treatments = await currentTreatments()
      return pacientesActions.updatePatient(id as number, {
        treatments: treatments.filter((t) => t.id !== treatmentId),
      })
    },
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

    addTreatment: addTreatmentMutation.mutateAsync,
    isAddingTreatment: addTreatmentMutation.isPending,
    removeTreatment: removeTreatmentMutation.mutateAsync,
    saveTreatments: saveTreatmentsMutation.mutateAsync,
  }
}

/**
 * Expedientes completos de todos los pacientes. `GET /pacientes` no trae
 * tratamientos, así que el dashboard necesita el detalle de cada uno.
 */
export function usePatientsWithTreatments() {
  const listQuery = useQuery({
    queryKey: queryKeys.patients.list(),
    queryFn: pacientesActions.listPatients,
  })

  const details = useQueries({
    queries: (listQuery.data ?? NO_PATIENTS).map((p) => ({
      queryKey: queryKeys.patients.detail(p.id),
      queryFn: () => pacientesActions.getPatient(p.id),
      staleTime: 60_000,
    })),
  })

  const patients = React.useMemo(
    () =>
      details
        .map((d) => d.data)
        .filter((p): p is Patient => Boolean(p)),
    [details],
  )

  return {
    patients,
    total: listQuery.data?.length ?? 0,
    isLoading: listQuery.isLoading || details.some((d) => d.isLoading),
    error: listQuery.error ?? details.find((d) => d.error)?.error ?? null,
  }
}
