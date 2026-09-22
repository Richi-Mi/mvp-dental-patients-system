import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { historialActions, pacientesActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import { applyToPatient, isTempId, mergeClinicalHistory } from "@/lib/offline-queue"
import { queryKeys } from "@/lib/query-keys"
import { saveOrQueue } from "@/lib/save-or-queue"
import type { ClinicalHistory, Patient } from "@/types/clinic"
import { useOwnPendingOperations } from "./useOwnPendingOperations"

/**
 * Historial clínico de un paciente + mutaciones para crearlo o editarlo.
 *
 * No tiene endpoint de lectura propio: viene en el expediente
 * (`GET /pacientes/:id`), así que comparte la caché de `usePatient` (misma
 * `queryKey`) y, como ese hook, combina los cambios sin sincronizar
 * (`applyToPatient`) y nunca pide al servidor el expediente de un paciente
 * creado sin conexión (id temporal, ver `isTempId`).
 */
export function useClinicalHistory(patientId: number) {
  const queryClient = useQueryClient()
  const ownPending = useOwnPendingOperations()
  const isTemp = isTempId(patientId)

  const detailQuery = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => pacientesActions.getPatient(patientId),
    enabled: !isTemp,
  })

  const patient = applyToPatient(detailQuery.data, patientId, ownPending)
  const clinicalHistory = patient?.clinicalHistory ?? null

  // `POST`/`PUT /historial` responden el historial final: se escribe directo
  // en el expediente en caché para mostrarlo sin esperar otro `GET`. Sin
  // conexión no hay respuesta que escribir: `applyToPatient` ya lo combina.
  function onSaved(result: ClinicalHistory) {
    queryClient.setQueryData<Patient>(
      queryKeys.patients.detail(patientId),
      (prev) => prev && { ...prev, clinicalHistory: result },
    )
  }

  const createMutation = useMutation({
    mutationFn: (answers: Partial<ClinicalHistory>) =>
      saveOrQueue({
        send: () => historialActions.createClinicalHistory(patientId, answers),
        op: { type: "historial.create", patientId, answers, subject: patient?.name ?? "" },
        optimistic: () => mergeClinicalHistory(clinicalHistory, answers),
      }),
    onSuccess: onSaved,
  })

  const updateMutation = useMutation({
    mutationFn: (answers: Partial<ClinicalHistory>) =>
      saveOrQueue({
        send: () => historialActions.updateClinicalHistory(patientId, answers),
        op: { type: "historial.update", patientId, answers, subject: patient?.name ?? "" },
        optimistic: () => mergeClinicalHistory(clinicalHistory, answers),
      }),
    onSuccess: onSaved,
  })

  return {
    clinicalHistory,
    isLoading: detailQuery.isLoading,
    error: isNetworkError(detailQuery.error) ? undefined : detailQuery.error,

    createClinicalHistory: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateClinicalHistory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}
