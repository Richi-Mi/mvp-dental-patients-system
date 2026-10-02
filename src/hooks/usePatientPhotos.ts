import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { fotosActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import { isTempId } from "@/lib/offline-queue"
import { queryKeys } from "@/lib/query-keys"
import type { PatientPhoto } from "@/types/clinic"

/** Referencia estable mientras no hay datos. */
const NO_PHOTOS: PatientPhoto[] = []

/**
 * Fotos de un paciente + mutaciones para subir y eliminar.
 *
 * No pasan por la cola sin conexión (`saveOrQueue`): los archivos no caben en
 * `localStorage`, así que subir o eliminar necesita conexión y, sin ella,
 * falla con el error de red. Un paciente creado sin conexión (id temporal)
 * aún no existe en el servidor: no se piden sus fotos (`isPendingSync`).
 */
export function usePatientPhotos(patientId: number) {
  const queryClient = useQueryClient()
  const isPendingSync = isTempId(patientId)
  const listKey = queryKeys.photos.list(patientId)

  const listQuery = useQuery({
    queryKey: listKey,
    queryFn: () => fotosActions.listPhotos(patientId),
    enabled: !isPendingSync,
  })

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => fotosActions.uploadPhotos(patientId, files),
    onSuccess: (created) => {
      queryClient.setQueryData<PatientPhoto[]>(listKey, (prev) => [
        ...(prev ?? []),
        ...created,
      ])
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (name: string) => fotosActions.deletePhoto(patientId, name),
    onSuccess: (deleted) => {
      queryClient.setQueryData<PatientPhoto[]>(listKey, (prev) =>
        prev?.filter((photo) => photo.name !== deleted.name),
      )
      queryClient.removeQueries({ queryKey: queryKeys.photos.file(deleted.url) })
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })

  return {
    photos: listQuery.data ?? NO_PHOTOS,
    isLoading: listQuery.isLoading,
    // Sin conexión se queda la última lista en caché, sin tapar la sección.
    error: isNetworkError(listQuery.error) ? undefined : listQuery.error,
    /** Paciente creado sin conexión que aún no se sincroniza. */
    isPendingSync,

    uploadPhotos: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,

    deletePhoto: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}

/**
 * Contenido (Blob) de una foto. La descarga lleva el header `token`, así que
 * la imagen se muestra con un object URL (ver `PhotoImage`).
 */
export function usePhotoFile(url: string) {
  return useQuery({
    queryKey: queryKeys.photos.file(url),
    queryFn: () => fotosActions.getPhotoFile(url),
    // El archivo de una url nunca cambia: cada foto nueva tiene otro nombre.
    staleTime: Infinity,
    // Si se vuelve a pedir (p. ej. al refrescar todo tras recuperar la
    // conexión) se conserva el Blob que ya estaba: la imagen no parpadea.
    structuralSharing: (previous, next) => previous ?? next,
    // Solo en memoria mientras se usa, no los 7 días del resto de la caché.
    gcTime: 5 * 60_000,
    // No se guarda en IndexedDB (ver `lib/query-persister.ts`).
    meta: { persist: false },
  })
}
