import * as React from "react"

import { DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * `DialogContent` que en teléfono (< sm) se abre como bottom sheet: ancho
 * completo, pegado abajo y con scroll interno, para que ningún campo quede
 * fuera de la pantalla (p. ej. con el teclado abierto). En tablet y escritorio
 * es el diálogo centrado de siempre.
 */
export function ResponsiveDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[92dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:gap-5 max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:rounded-t-3xl max-sm:rounded-b-none max-sm:px-4 max-sm:shadow-2xl",
        "max-sm:data-open:zoom-in-100 max-sm:data-open:slide-in-from-bottom-10 max-sm:data-closed:zoom-out-100 max-sm:data-closed:slide-out-to-bottom-10",
        className,
      )}
      {...props}
    />
  )
}
