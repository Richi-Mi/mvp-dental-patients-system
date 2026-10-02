import * as React from "react"
import { ImageOff } from "lucide-react"

import { usePhotoFile } from "@/hooks/usePatientPhotos"
import { cn } from "@/lib/utils"

/**
 * `<img>` de una foto de paciente. La imagen exige el header `token`, así que
 * se descarga como Blob (`usePhotoFile`) y se muestra con un object URL que se
 * libera al desmontar. Mientras carga se ve un recuadro; si falla (p. ej. sin
 * conexión), un ícono.
 */
export function PhotoImage({
  url,
  alt,
  className,
}: {
  url: string
  alt: string
  className?: string
}) {
  const { data: blob, isError } = usePhotoFile(url)
  const imgRef = React.useRef<HTMLImageElement>(null)

  // Antes de pintar, para que el `<img>` nunca se vea sin imagen.
  React.useLayoutEffect(() => {
    const img = imgRef.current
    if (!blob || !img) return
    const objectUrl = URL.createObjectURL(blob)
    img.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!blob) {
    return (
      <div
        aria-hidden
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          !isError && "animate-pulse",
          className,
        )}
      >
        {isError && <ImageOff className="size-6" />}
      </div>
    )
  }

  return <img ref={imgRef} alt={alt} className={className} />
}
