"use client"

import * as React from "react"
import { Loader2, RotateCcw, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { isNetworkError } from "@/api/client"
import { useAjustes } from "@/hooks/useAjustes"
import { useAuth } from "@/hooks/useAuth"
import { useFontSize } from "@/hooks/useFontSize"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { formatPercent } from "@/lib/clinic-data"
import { FONT_SIZE } from "@/lib/font-size"
import { MOBILE_CARD } from "@/lib/responsive"
import { cn } from "@/lib/utils"

export function SettingsView() {
  const { isMedico } = useAuth()

  // El loader de la ruta ya bloquea el acceso; esto cubre el caso de que el
  // rol cambie con la vista abierta.
  if (!isMedico) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <ShieldAlert className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Solo un usuario de tipo médico puede cambiar los ajustes.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Ajustes
        </h1>
        <p className="text-sm text-muted-foreground">
          Preferencias de la aplicación y de tu agenda.
        </p>
      </div>

      <FontSizeCard />
      <AppointmentsCard />
    </div>
  )
}

/**
 * Tamaño de letra de este usuario en este dispositivo. Se aplica al soltar el
 * slider (o con cada tecla): aplicarlo mientras se arrastra cambiaría el ancho
 * del propio slider bajo el dedo. Mientras tanto, la muestra lo adelanta.
 */
function FontSizeCard() {
  const { fontSize, isDefault, setFontSize, resetFontSize } = useFontSize()
  const isMobile = useIsMobile()
  const [draft, setDraft] = React.useState<number | null>(null)
  const titleId = React.useId()

  // En teléfono no baja de 100 % (iOS hace zoom en campos de menos de 16px).
  const min = isMobile ? FONT_SIZE.phoneMin : FONT_SIZE.min
  const shown = Math.max(draft ?? fontSize, min)

  return (
    <Card className={cn("border-border/70", MOBILE_CARD)}>
      <CardHeader>
        <CardTitle id={titleId} className="text-base">
          Tamaño de letra
        </CardTitle>
        <CardDescription>
          Solo para tu usuario en este dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span aria-hidden className="text-sm font-medium text-muted-foreground">
            A
          </span>
          <Slider
            aria-labelledby={titleId}
            min={min}
            max={FONT_SIZE.max}
            step={FONT_SIZE.step}
            value={[shown]}
            format={{ style: "unit", unit: "percent" }}
            locale="es-MX"
            onValueChange={(value) =>
              setDraft(Array.isArray(value) ? value[0] : value)
            }
            onValueCommitted={(value) => {
              setFontSize(Array.isArray(value) ? value[0] : value)
              setDraft(null)
            }}
            className="flex-1 py-3"
          />
          <span aria-hidden className="text-xl font-medium text-muted-foreground">
            A
          </span>
          <span className="w-12 text-right text-sm font-medium tabular-nums text-foreground">
            {formatPercent(shown / 100)}
          </span>
        </div>

        <p
          className="rounded-lg bg-muted px-4 py-3 text-foreground"
          // 1rem ya es el tamaño aplicado; la muestra adelanta el que se elige.
          style={{ fontSize: `${shown / Math.max(fontSize, min)}rem` }}
        >
          Así se verán la agenda, los expedientes y el resto de la aplicación.
        </p>

        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={isDefault && draft === null}
            onClick={() => {
              setDraft(null)
              resetFontSize()
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Restablecer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Ajustes de la agenda guardados en el servidor: necesitan conexión. */
function AppointmentsCard() {
  const { ajustes, isLoading, error, updateAjustes, isUpdating } = useAjustes()
  const titleId = React.useId()
  const descriptionId = React.useId()

  async function toggleAutocomplete(checked: boolean) {
    try {
      const { citasCompletadas } = await updateAjustes({
        autocompletarCitas: checked,
      })
      if (!checked) {
        toast.success("Autocompletado desactivado.")
      } else if (citasCompletadas === 0) {
        toast.success("Autocompletado activado.")
      } else {
        toast.success(
          citasCompletadas === 1
            ? "Autocompletado activado. 1 cita pasó a Completada."
            : `Autocompletado activado. ${citasCompletadas} citas pasaron a Completada.`,
        )
      }
    } catch (err) {
      toast.error(
        isNetworkError(err)
          ? "Sin conexión: este ajuste solo se puede cambiar con internet."
          : err instanceof Error
            ? err.message
            : "No se pudo guardar el ajuste.",
      )
    }
  }

  return (
    <Card className={cn("border-border/70", MOBILE_CARD)}>
      <CardHeader>
        <CardTitle className="text-base">Citas</CardTitle>
        <CardDescription>Se aplica a tu agenda en todos tus dispositivos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error instanceof Error
              ? error.message
              : "No se pudieron cargar los ajustes."}
          </p>
        )}

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle id={titleId}>
              Completar citas automáticamente
              {(isLoading || isUpdating) && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
            </FieldTitle>
            <FieldDescription id={descriptionId}>
              Las citas confirmadas pasan a «Completada» un día después de su
              hora de inicio. Las citas con otro estatus no cambian. Al
              activarlo también se completan las confirmadas que ya pasaron.
            </FieldDescription>
          </FieldContent>
          <Switch
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            checked={ajustes?.autocompletarCitas ?? false}
            disabled={!ajustes || isUpdating}
            onCheckedChange={(checked) => void toggleAutocomplete(checked)}
            className="mt-1"
          />
        </Field>
      </CardContent>
    </Card>
  )
}
