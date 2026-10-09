"use client"

import {
  TimePicker as ReuiTimePicker,
  TimePickerColumns,
  TimePickerConfirm,
  TimePickerContent,
  TimePickerFooter,
  TimePickerNow,
  TimePickerTrigger,
  type TimePickerI18nOverrides,
} from "@/components/reui/time-picker"
import { cn } from "@/lib/utils"

/**
 * Selector de hora de la app: el `TimePicker` de reui (`@reui/time-picker`,
 * columnas de hora y minuto en un popover) en español y en 24 h.
 *
 * Trabaja sobre un string `HH:mm`, que es el formato que usa el resto de la
 * app (`Appointment.time` y `Appointment.endTime`).
 */

/** Minutos entre una opción y la siguiente en la columna de minutos. */
export const MINUTE_STEP = 5

// Fuera del componente: reui memoiza las etiquetas por identidad.
const I18N: TimePickerI18nOverrides = {
  labels: {
    placeholder: "Elige la hora",
    hour: "Hora",
    minute: "Min",
    now: "Ahora",
    clear: "Borrar",
    confirm: "Listo",
    panelLabel: "Elige la hora",
    openPicker: "Abrir selector de hora",
  },
}

export type TimePickerProps = {
  id?: string
  /** Hora en formato `HH:mm` (24 h). */
  value: string
  onChange: (time: string) => void
  /** Primera hora que se puede elegir (`HH:mm`), incluida. */
  min?: string
  /** Última hora que se puede elegir (`HH:mm`), incluida. */
  max?: string
  invalid?: boolean
  disabled?: boolean
  /** El id del `FieldLabel`: el botón se anuncia como "etiqueta + hora". */
  "aria-labelledby"?: string
  "aria-describedby"?: string
  className?: string
}

export function TimePicker({
  value,
  onChange,
  className,
  ...props
}: TimePickerProps) {
  return (
    <ReuiTimePicker
      {...props}
      value={value}
      // La cita siempre tiene hora: el pie no trae "Borrar", así que `null`
      // no debería llegar, y si llega se ignora.
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
      minuteStep={MINUTE_STEP}
      i18n={I18N}
    >
      <TimePickerTrigger
        className={cn("h-9 w-full rounded-lg px-3 max-sm:text-base", className)}
      />
      <TimePickerContent>
        <TimePickerColumns />
        <TimePickerFooter>
          <TimePickerNow />
          <TimePickerConfirm />
        </TimePickerFooter>
      </TimePickerContent>
    </ReuiTimePicker>
  )
}
