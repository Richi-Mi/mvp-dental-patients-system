import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type ConfirmDialogProps = {
  /** Elemento que abre el diálogo (se pasa como `render` del trigger). */
  trigger: React.ReactElement
  title: string
  description: string
  confirmLabel: string
  /** Toast al terminar `onConfirm` sin errores. */
  successMessage: string
  /** Toast al cerrar sin confirmar (botón Cancelar o Esc). */
  cancelMessage?: string
  /** Toast si `onConfirm` falla y el error no trae mensaje propio. */
  errorMessage?: string
  onConfirm: () => Promise<unknown>
}

/**
 * Reemplazo de `window.confirm` para acciones destructivas. Mientras corre
 * `onConfirm` el diálogo no se puede cerrar; si falla, sigue abierto para
 * reintentar.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  successMessage,
  cancelMessage = "Acción cancelada",
  errorMessage = "No se pudo completar la acción.",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
      toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorMessage)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        // Tras confirmar se cierra con `setOpen`, no por aquí: esto solo
        // corre al cancelar.
        if (!next) toast.info(cancelMessage)
        setOpen(next)
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
