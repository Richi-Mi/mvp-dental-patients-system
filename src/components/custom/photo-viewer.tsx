import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PhotoImage } from "@/components/custom/photo-image"
import { formatLongDate } from "@/lib/clinic-data"
import type { PatientPhoto } from "@/types/clinic"

/** Botones `<` y `>` sobre la imagen. */
const NAV_BUTTON = "absolute top-1/2 -translate-y-1/2 rounded-full shadow-md"

/**
 * Visor de las fotos de un paciente. `index` es la foto abierta (`null` =
 * cerrado). `<` y `>`, o las flechas del teclado, recorren las fotos y dan la
 * vuelta al llegar a un extremo.
 */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
}: {
  photos: PatientPhoto[]
  index: number | null
  onIndexChange: (index: number | null) => void
}) {
  const count = photos.length

  // Al cerrar, el diálogo sigue mostrando la última foto mientras se anima,
  // en vez de encogerse vacío. Ajustar el estado durante el render es el
  // patrón que recomienda React (ver `TreatmentsTable`).
  const [shown, setShown] = React.useState(index ?? 0)
  if (index !== null && index !== shown) setShown(index)

  // Si la lista cambió con el visor abierto, no se sale del rango.
  const current = Math.min(shown, count - 1)
  const photo = photos[current]
  const open = index !== null && photo !== undefined

  function go(delta: 1 | -1) {
    onIndexChange((current + delta + count) % count)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (count < 2) return
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      go(-1)
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      go(1)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onIndexChange(null)
      }}
    >
      <DialogContent onKeyDown={handleKeyDown} className="gap-3 p-4 sm:max-w-4xl">
        {photo && (
          <>
            <DialogHeader className="pr-10">
              <DialogTitle className="tabular-nums">
                Imagen {current + 1} de {count}
              </DialogTitle>
              <DialogDescription>
                {photo.uploadedAt
                  ? `Subida el ${formatLongDate(photo.uploadedAt)}`
                  : "Imagen del paciente"}
              </DialogDescription>
            </DialogHeader>

            <div className="relative h-[min(70dvh,48rem)] overflow-hidden rounded-lg bg-muted">
              <PhotoImage
                key={photo.url}
                url={photo.url}
                alt={`Imagen ${current + 1} de ${count}`}
                className="size-full object-contain"
              />

              {count > 1 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => go(-1)}
                    aria-label="Imagen anterior"
                    className={`${NAV_BUTTON} left-2`}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => go(1)}
                    aria-label="Imagen siguiente"
                    className={`${NAV_BUTTON} right-2`}
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
