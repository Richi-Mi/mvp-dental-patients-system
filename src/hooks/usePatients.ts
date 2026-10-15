import * as React from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { pacientesActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import {
  applyToPatient,
  applyToPatients,
  isTempId,
  newTempPatientId,
  patientFromCreate,
} from "@/lib/offline-queue"
import { filterPatients } from "@/lib/patient-search"
import { queryKeys } from "@/lib/query-keys"
import { saveOrQueue } from "@/lib/save-or-queue"
import { useAuthStore } from "@/store/auth.store"
import { useUiStore } from "@/store/ui.store"
import type { Patient, PatientInput, Treatment } from "@/types/clinic"
import { useActiveMedico } from "./useMedicos"
import { useOwnPendingOperations } from "./useOwnPendingOperations"

/** Referencia estable para evitar recalcular memos en cada render. */
const NO_PATIENTS: Patient[] = []

/**
 * Listado de pacientes del médico autenticado (`/pacientes`) + mutaciones.
 * El buscador es local: el endpoint de listado no recibe filtros.
 *
 * Un asistente no tiene pacientes propios: ve los del médico que tenga
 * elegido (`?correo_medico=`), el mismo de la agenda.
 *
 * Sin conexión, las mutaciones se guardan en la cola de `store/offline.store`
 * (ver `lib/save-or-queue.ts`) y esta lista las combina de inmediato con lo
 * último que trajo el servidor (`applyToPatients`), incluidas las altas, que
 * quedan con un id temporal (negativo) hasta sincronizarse.
 */
export function usePatients() {
  const search = useUiStore((s) => s.patientSearch)
  const setSearch = useUiStore((s) => s.setPatientSearch)
  const propio = useAuthStore((s) => s.usuario?.correo ?? null)
  const { medicoEmail, isReady } = useActiveMedico()
  const queryClient = useQueryClient()
  const ownPending = useOwnPendingOperations()

  // A quién se asignan los pacientes nuevos: al médico elegido o a uno mismo.
  const correoMedico = medicoEmail ?? propio

  const listQuery = useQuery({
    queryKey: queryKeys.patients.list(medicoEmail),
    queryFn: () => pacientesActions.listPatients(medicoEmail),
    enabled: isReady,
  })

  const patients = React.useMemo(
    () =>
      applyToPatients(listQuery.data ?? NO_PATIENTS, ownPending, correoMedico ?? "")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [listQuery.data, ownPending, correoMedico],
  )

  const filtered = React.useMemo(
    () => filterPatients(patients, search),
    [patients, search],
  )

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
    mutationFn: (
      input: PatientInput & { birthDate: string; medicoEmail?: string | null },
    ) => {
      const { medicoEmail: override, ...rest } = input
      const medicoCorreo = override ?? correoMedico ?? ""
      const op = {
        type: "paciente.create" as const,
        patientId: newTempPatientId(),
        medicoCorreo,
        input: rest,
        subject: rest.name,
      }
      return saveOrQueue({
        send: () => pacientesActions.createPatient({ medicoEmail: correoMedico, ...input }),
        op,
        optimistic: () => patientFromCreate(op),
      })
    },
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
    }) => {
      const current = patients.find((p) => p.id === id)
      return saveOrQueue({
        send: () => pacientesActions.updatePatient(id, input),
        op: { type: "paciente.update", patientId: id, input, subject: current?.name ?? "" },
        optimistic: () => {
          if (!current) throw new Error("Paciente no encontrado")
          const { treatments, ...fields } = input
          return { ...current, ...fields, treatments: treatments ?? current.treatments }
        },
      })
    },
    onSuccess: (patient) => invalidate(patient.id),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      const current = patients.find((p) => p.id === id)
      return saveOrQueue({
        send: () => pacientesActions.deletePatient(id),
        op: { type: "paciente.delete", patientId: id, subject: current?.name ?? "" },
        optimistic: () => {
          if (!current) throw new Error("Paciente no encontrado")
          return current
        },
      })
    },
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
    // Ver el comentario equivalente en `useAgenda`: sin conexión no se tapa
    // la lista (ya al día con los cambios pendientes) con un error de fondo.
    error: isNetworkError(listQuery.error) ? undefined : listQuery.error,
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
 *
 * Un paciente creado sin conexión tiene un id temporal (negativo, ver
 * `isTempId`): nunca se pide al servidor (no existe ahí todavía) y su
 * expediente sale por completo de la cola de cambios pendientes
 * (`applyToPatient`).
 */
export function usePatient(id: number | undefined) {
  const isTemp = typeof id === "number" && isTempId(id)
  const enabled = typeof id === "number" && Number.isFinite(id) && !isTemp
  const queryClient = useQueryClient()
  const ownPending = useOwnPendingOperations()

  const detailQuery = useQuery({
    queryKey: queryKeys.patients.detail(id ?? -1),
    queryFn: () => pacientesActions.getPatient(id as number),
    enabled,
  })

  const patient = React.useMemo(
    () => (id === undefined ? undefined : applyToPatient(detailQuery.data, id, ownPending)),
    [detailQuery.data, id, ownPending],
  )

  const onPatientChange = React.useCallback(() => {
    if (id === undefined) return
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.list() })
  }, [id, queryClient])

  /**
   * Envía la lista final completa: `PUT /pacientes/:id` reemplaza todos los
   * tratamientos guardados, no los actualiza uno por uno.
   */
  const saveTreatmentsMutation = useMutation({
    mutationFn: (treatments: Treatment[]) =>
      saveOrQueue({
        send: () => pacientesActions.updatePatient(id as number, { treatments }),
        op: {
          type: "paciente.update",
          patientId: id as number,
          input: { treatments },
          subject: patient?.name ?? "",
        },
        optimistic: () => {
          if (!patient) throw new Error("Paciente no encontrado")
          return { ...patient, treatments }
        },
      }),
    onSuccess: onPatientChange,
  })

  const updateMutation = useMutation({
    mutationFn: (input: Partial<PatientInput>) =>
      saveOrQueue({
        send: () => pacientesActions.updatePatient(id as number, input),
        op: { type: "paciente.update", patientId: id as number, input, subject: patient?.name ?? "" },
        optimistic: () => {
          if (!patient) throw new Error("Paciente no encontrado")
          return { ...patient, ...input }
        },
      }),
    onSuccess: onPatientChange,
  })

  return {
    patient,
    treatments: patient?.treatments ?? [],
    upcoming: patient?.upcoming ?? [],
    nextAppointment: patient?.upcoming?.[0],
    isLoading: detailQuery.isLoading,
    isFetching: detailQuery.isFetching,
    error: isNetworkError(detailQuery.error) ? undefined : detailQuery.error,

    updatePatient: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    saveTreatments: saveTreatmentsMutation.mutateAsync,
    isSavingTreatments: saveTreatmentsMutation.isPending,
    saveTreatmentsError: saveTreatmentsMutation.error,
  }
}
