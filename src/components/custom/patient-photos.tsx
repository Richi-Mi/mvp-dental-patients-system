import * as React from "react"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { PhotoImage } from "@/components/custom/photo-image"
import { PhotoViewer } from "@/components/custom/photo-viewer"
import { usePatientPhotos } from "@/hooks/usePatientPhotos"
import { formatLongDate } from "@/lib/clinic-data"
import {
  MAX_PATIENT_PHOTOS,
  MAX_PHOTO_MB,
  PHOTO_ACCEPT,
  photoSelectionError,
} from "@/lib/patient-photos"
import { MOBILE_CARD } from "@/lib/responsive"
import { cn } from "@/lib/utils"

/**
 * Botón de eliminar de cada miniatura: como las acciones de las tarjetas de la
 * agenda, en escritorio aparece al pasar el puntero y donde no hay hover se ve
 * siempre. El área táctil de 44px se arma con su propio `::after` y no con
 * `touch-hitbox`, que pone `position: relative` y lo sacaría de la esquina.
 */
const DELETE_BUTTON =
  "absolute top-1.5 right-1.5 flex size-8 cursor-pointer items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-600 focus-visible:opacity-100 disabled:opacity-50 max-lg:opacity-100 max-lg:disabled:opacity-50 max-lg:after:absolute max-lg:after:-inset-1.5 max-lg:after:content-['']"

/**
 * "Imágenes del paciente" en el expediente: sube hasta `MAX_PATIENT_PHOTOS`
 * imágenes (el backend las guarda en WebP), las muestra en miniaturas y las
 * abre en un visor. Necesita conexión: las imágenes no pasan por la cola sin
 * conexión.
 */
export function PatientPhotos({ patientId }: { patientId: number }) {
  const {
    photos,
    isLoading,
    error,
    isPendingSync,
    uploadPhotos,
    isUploading,
    deletePhoto,
    isDeleting,
  } = usePatientPhotos(patientId)
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isFull = photos.length >= MAX_PATIENT_PHOTOS

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // Se limpia para poder volver a elegir los mismos archivos.
    event.target.value = ""
    if (files.length === 0) return

    const problem = photoSelectionError(photos.length, files)
    if (problem) {
      toast.error(problem)
      return
    }

    try {
      await uploadPhotos(files)
      toast.success(
        files.length === 1
          ? "Se subió la imagen."
          : `Se subieron ${files.length} imágenes.`,
      )
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudieron subir las imágenes.",
      )
    }
  }

  let content: React.ReactNode
  if (isPendingSync) {
    content = (
      <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        Este paciente se registró sin conexión: podrás agregar imágenes en
        cuanto se sincronice.
      </p>
    )
  } else if (isLoading) {
    content = (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando imágenes...
      </p>
    )
  } else if (error) {
    content = (
      <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error instanceof Error
          ? error.message
          : "No se pudieron cargar las imágenes."}
      </p>
    )
  } else if (photos.length === 0) {
    content = (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Sin imágenes. Pulsa "Añadir imágenes" para subir hasta{" "}
        {MAX_PATIENT_PHOTOS}.
      </p>
    )
  } else {
    content = (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {photos.map((photo, index) => (
          <li
            key={photo.name}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-muted"
          >
            <button
              type="button"
              onClick={() => setViewerIndex(index)}
              aria-label={`Ver imagen ${index + 1} de ${photos.length}`}
              className="size-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <PhotoImage url={photo.url} alt="" className="size-full object-cover" />
            </button>

            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  disabled={isDeleting}
                  aria-label={`Eliminar imagen ${index + 1}`}
                  className={DELETE_BUTTON}
                >
                  <Trash2 className="size-4" />
                </button>
              }
              title="¿Eliminar esta imagen?"
              description={`Imagen ${index + 1} de ${photos.length}${photo.uploadedAt ? `, subida el ${formatLongDate(photo.uploadedAt)}` : ""}. La acción no se puede deshacer.`}
              confirmLabel="Eliminar imagen"
              successMessage="La imagen se eliminó."
              cancelMessage="Se canceló la eliminación de la imagen."
              onConfirm={() => deletePhoto(photo.name)}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Card className={cn("border-border/70", MOBILE_CARD)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-64 flex-1 max-sm:min-w-0">
            <CardTitle className="text-base">Imágenes del paciente</CardTitle>
            <CardDescription>
              JPG, PNG, WebP, GIF o BMP de hasta {MAX_PHOTO_MB} MB. Se guardan
              en formato WebP.
            </CardDescription>
          </div>

          <div className="flex shrink-0 items-center gap-3 max-sm:w-full">
            <span
              title={`${photos.length} de ${MAX_PATIENT_PHOTOS} imágenes`}
              className="text-sm font-medium tabular-nums text-muted-foreground"
            >
              {photos.length}/{MAX_PATIENT_PHOTOS}
            </span>
            <Button
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isFull || isUploading || isPendingSync || isLoading}
              className="max-sm:flex-1"
            >
              {isUploading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <ImagePlus data-icon="inline-start" />
              )}
              {isUploading ? "Subiendo..." : "Añadir imágenes"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={PHOTO_ACCEPT}
              multiple
              hidden
              onChange={handleFiles}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>{content}</CardContent>

      <PhotoViewer
        photos={photos}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
      />
    </Card>
  )
}
