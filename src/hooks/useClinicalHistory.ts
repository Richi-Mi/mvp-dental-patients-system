import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { historialActions, pacientesActions } from "@/actions"
import { queryKeys } from "@/lib/query-keys"
import type { ClinicalHistory, Patient } from "@/types/clinic"

/**
 * Historial clínico de un paciente + mutaciones para crearlo o editarlo.
 *
 * No tiene endpoint de lectura propio: viene en el expediente
 * (`GET /pacientes/:id`), así que comparte la caché de `usePatient`.
 */
export function useClinicalHistory(patientId: number) {
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => pacientesActions.getPatient(patientId),
  })

  // `POST`/`PUT /historial` responden el historial final: se escribe directo
  // en el expediente en caché para mostrarlo sin esperar otro `GET`.
  function onSaved(clinicalHistory: ClinicalHistory) {
    queryClient.setQueryData<Patient>(
      queryKeys.patients.detail(patientId),
      (prev) => prev && { ...prev, clinicalHistory },
    )
  }

  const createMutation = useMutation({
    mutationFn: (answers: Partial<ClinicalHistory>) =>
      historialActions.createClinicalHistory(patientId, answers),
    onSuccess: onSaved,
  })

  const updateMutation = useMutation({
    mutationFn: (answers: Partial<ClinicalHistory>) =>
      historialActions.updateClinicalHistory(patientId, answers),
    onSuccess: onSaved,
  })

  return {
    clinicalHistory: detailQuery.data?.clinicalHistory ?? null,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,

    createClinicalHistory: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateClinicalHistory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}
