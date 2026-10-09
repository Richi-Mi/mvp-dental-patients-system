"use client"

import * as React from "react"
import { Loader2, RotateCcw } from "lucide-react"
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
import { HourRangeSlider } from "@/components/custom/hour-range-slider"
import { MINUTE_STEP } from "@/components/custom/time-picker"
import { isNetworkError } from "@/api/client"
import { useAjustes } from "@/hooks/useAjustes"
import { useAuth } from "@/hooks/useAuth"
import { useFontSize } from "@/hooks/useFontSize"
import { useIsMobile } from "@/hooks/useMediaQuery"
import {
  DEFAULT_WORKING_HOURS,
  WORKING_HOURS_LIMITS,
  appointmentTimeBounds,
  formatPercent,
  formatWorkingHours,
  hourLabel,
} from "@/lib/clinic-data"
import { FONT_SIZE } from "@/lib/font-size"
import { MOBILE_CARD } from "@/lib/responsive"
import { cn } from "@/lib/utils"
import type { WorkingHours } from "@/types/clinic"

/**
 * Los ajustes se guardan en el servidor, por usuario: cada médico y cada
 * asistente tiene los suyos, iguales en todos sus dispositivos. Cambiarlos
 * necesita conexión (no pasan por la cola sin conexión).
 */
export function SettingsView() {
  const { isMedico } = useAuth()
  const { error } = useAjustes()

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

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error instanceof Error
            ? error.message
            : "No se pudieron cargar los ajustes."}
        </p>
      )}

      <FontSizeCard />
      <WorkingHoursCard />
      {/* Las citas que se completan solas son las del médico. */}
      {isMedico && <AppointmentsCard />}
    </div>
  )
}

/** Mensaje del toast cuando un ajuste no se pudo guardar. */
function saveErrorMessage(err: unknown): string {
  if (isNetworkError(err)) {
    return "Sin conexión: este ajuste solo se puede cambiar con internet."
  }
  return err instanceof Error ? err.message : "No se pudo guardar el ajuste."
}

/**
 * Tamaño de letra de este usuario. Se aplica y se guarda al soltar el slider
 * (o con cada tecla): aplicarlo mientras se arrastra cambiaría el ancho del
 * propio slider bajo el dedo. Mientras tanto, la muestra lo adelanta.
 */
function FontSizeCard() {
  const { fontSize, isDefault, isSaving, setFontSize } = useFontSize()
  const isMobile = useIsMobile()
  const [draft, setDraft] = React.useState<number | null>(null)
  const titleId = React.useId()

  async function save(percent: number) {
    setDraft(null)
    try {
      await setFontSize(percent)
    } catch (err) {
      toast.error(saveErrorMessage(err))
    }
  }

  // En teléfono no baja de 100 % (iOS hace zoom en campos de menos de 16px).
  const min = isMobile ? FONT_SIZE.phoneMin : FONT_SIZE.min
  const shown = Math.max(draft ?? fontSize, min)

  return (
    <Card className={cn("border-border/70", MOBILE_CARD)}>
      <CardHeader>
        <CardTitle id={titleId} className="flex items-center gap-2 text-base">
          Tamaño de letra
          {isSaving && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription>
          Para tu usuario, en todos tus dispositivos.
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
            onValueCommitted={(value) =>
              void save(Array.isArray(value) ? value[0] : value)
            }
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
            onClick={() => void save(FONT_SIZE.default)}
          >
            <RotateCcw data-icon="inline-start" />
            Restablecer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Horario de atención del usuario: las filas de su agenda y las horas que se
 * pueden elegir al agendar. Se guarda al soltar el slider; mientras se
 * arrastra solo cambia lo que se lee aquí.
 */
function WorkingHoursCard() {
  const { ajustes, isLoading, updateAjustes, isUpdating } = useAjustes()
  const hours = ajustes?.workingHours ?? DEFAULT_WORKING_HOURS
  const [draft, setDraft] = React.useState<WorkingHours | null>(null)
  const shown = draft ?? hours
  const { lastStart } = appointmentTimeBounds(shown, MINUTE_STEP)
  const titleId = React.useId()
  const descriptionId = React.useId()

  async function save([opening, closing]: [number, number]) {
    setDraft(null)
    if (opening === hours.opening && closing === hours.closing) return
    const next = { opening, closing }
    try {
      await updateAjustes({ workingHours: next })
      toast.success(`Horario guardado: de ${formatWorkingHours(next)}.`)
    } catch (err) {
      toast.error(saveErrorMessage(err))
    }
  }

  return (
    <Card className={cn("border-border/70", MOBILE_CARD)}>
      <CardHeader>
        <CardTitle id={titleId} className="flex items-center gap-2 text-base">
          Horario de atención
          {(isLoading || isUpdating) && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription id={descriptionId}>
          Las horas de tu agenda y las que se pueden elegir al agendar una
          cita. Para tu usuario, en todos tus dispositivos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="text-xs font-medium tabular-nums text-muted-foreground max-sm:hidden"
          >
            {hourLabel(WORKING_HOURS_LIMITS.min)}
          </span>
          <HourRangeSlider
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            min={WORKING_HOURS_LIMITS.min}
            max={WORKING_HOURS_LIMITS.max}
            value={[shown.opening, shown.closing]}
            // Sin los ajustes cargados no hay contra qué comparar ni qué
            // adelantar: se espera a que lleguen.
            disabled={!ajustes}
            onValueChange={([opening, closing]) => setDraft({ opening, closing })}
            onValueCommitted={(value) => void save(value)}
            className="flex-1 py-3"
          />
          <span
            aria-hidden
            className="text-xs font-medium tabular-nums text-muted-foreground max-sm:hidden"
          >
            {hourLabel(WORKING_HOURS_LIMITS.max)}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-lg bg-muted px-4 py-3">
          <p className="text-sm font-medium tabular-nums text-foreground">
            De {formatWorkingHours(shown)}
          </p>
          <p className="text-sm text-muted-foreground">
            La última hora es completa: se puede agendar hasta las{" "}
            <span className="tabular-nums">{lastStart}</span>. Las citas que
            queden fuera del horario se siguen viendo en la fila «Fuera».
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/** Autocompletado de citas (solo médico): necesita conexión. */
function AppointmentsCard() {
  const { ajustes, isLoading, updateAjustes, isUpdating } = useAjustes()
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
      toast.error(saveErrorMessage(err))
    }
  }

  return (
    <Card className={cn("border-border/70", MOBILE_CARD)}>
      <CardHeader>
        <CardTitle className="text-base">Citas</CardTitle>
        <CardDescription>Se aplica a tus citas, en todos tus dispositivos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
