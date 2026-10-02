"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import {
  OPENING_HOURS,
  clampSegment,
  splitTime,
  typeDigit,
  type HourRange,
  type Segment,
} from "@/lib/time-segment"
import { cn } from "@/lib/utils"

/**
 * Time picker por segmentos, al estilo de https://time.openstatus.dev:
 * sin librerías extra, gobernado por `keydown` (flechas para subir/bajar y
 * para moverse entre campos), con avance automático al segundo dígito y
 * teclado numérico en móvil.
 *
 * Trabaja sobre un string `HH:mm` en 24 h, que es el formato que usa el resto
 * de la app (`Appointment.time` y `Appointment.endTime`).
 */

type TimeSegmentProps = {
  id?: string
  segment: Segment
  label: string
  value: string
  hours: HourRange
  onChange: (time: string) => void
  onLeftFocus?: () => void
  onRightFocus?: () => void
  ref?: React.Ref<HTMLInputElement>
  disabled?: boolean
  /** Cuánto suben/bajan las flechas (p. ej. minutos de 10 en 10). */
  arrowStep?: number
  /** En qué evento de teclado se aplica el paso de flechas. */
  arrowStepEvent?: "keydown" | "keyup"
}

function TimeSegment({
  id,
  segment,
  label,
  value,
  hours,
  onChange,
  onLeftFocus,
  onRightFocus,
  ref,
  disabled,
  arrowStep = 1,
  arrowStepEvent = "keydown",
}: TimeSegmentProps) {
  // Primer dígito ya tecleado del par, a la espera del segundo. Se guarda
  // aparte del valor mostrado, que ya viene ajustado al rango.
  const [pending, setPending] = React.useState<string | null>(null)

  const parts = splitTime(value, hours)
  const current = parts[segment]

  // Si el usuario se detiene, el siguiente dígito vuelve a empezar el par.
  React.useEffect(() => {
    if (pending === null) return
    const timer = setTimeout(() => setPending(null), 2000)
    return () => clearTimeout(timer)
  }, [pending])

  function commit(next: string) {
    onChange(
      segment === "hours"
        ? `${next}:${parts.minutes}`
        : `${parts.hours}:${next}`,
    )
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Tab") return
    event.preventDefault()

    if (event.key === "ArrowRight") {
      onRightFocus?.()
      return
    }
    if (event.key === "ArrowLeft") {
      onLeftFocus?.()
      return
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // El paso puede aplicarse al soltar la tecla en vez de al presionarla
      // (p. ej. minutos, que avanzan de 10 en 10 con `keyup`).
      if (arrowStepEvent === "keyup") return
      const step = event.key === "ArrowUp" ? arrowStep : -arrowStep
      setPending(null)
      commit(clampSegment(String(Number(current) + step), segment, true, hours))
      return
    }

    if (event.key.length === 1 && event.key >= "0" && event.key <= "9") {
      const result = typeDigit(segment, pending, event.key, hours)
      commit(result.value)
      setPending(result.pending)
      if (result.advance) onRightFocus?.()
    }
  }

  function handleKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
    if (arrowStepEvent !== "keyup") return
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return

    const step = event.key === "ArrowUp" ? arrowStep : -arrowStep
    setPending(null)
    commit(clampSegment(String(Number(current) + step), segment, true, hours))
  }

  return (
    <input
      id={id}
      ref={ref}
      type="text"
      inputMode="decimal"
      maxLength={2}
      value={current}
      disabled={disabled}
      aria-label={label}
      // El valor solo cambia desde `onKeyDown`; esto mantiene el input
      // controlado sin que el navegador escriba por su cuenta.
      onChange={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => setPending(null)}
      className={cn(
        "h-9 w-12 rounded-lg border border-input bg-transparent text-center text-sm tabular-nums shadow-xs outline-none transition-colors max-lg:h-11 max-lg:w-14 max-sm:text-base",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    />
  )
}

export type TimePickerProps = {
  id?: string
  /** Hora en formato `HH:mm` (24 h). */
  value: string
  onChange: (time: string) => void
  /**
   * Nombre del campo para lectores de pantalla ("Hora de fin"): hace falta si
   * hay más de un selector de hora en el formulario.
   */
  label?: string
  /** Última hora que admite; por defecto, `CLOSING_HOUR`. */
  maxHour?: number
  disabled?: boolean
  className?: string
}

export function TimePicker({
  id,
  value,
  onChange,
  label,
  maxHour = OPENING_HOURS.max,
  disabled,
  className,
}: TimePickerProps) {
  const hoursRef = React.useRef<HTMLInputElement>(null)
  const minutesRef = React.useRef<HTMLInputElement>(null)
  const hours: HourRange = { min: OPENING_HOURS.min, max: maxHour }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <TimeSegment
        id={id}
        ref={hoursRef}
        segment="hours"
        label={label ? `${label}, horas` : "Horas"}
        value={value}
        hours={hours}
        onChange={onChange}
        onRightFocus={() => minutesRef.current?.focus()}
        disabled={disabled}
      />
      <span aria-hidden className="text-sm font-medium text-muted-foreground">
        :
      </span>
      <TimeSegment
        ref={minutesRef}
        segment="minutes"
        label={label ? `${label}, minutos` : "Minutos"}
        value={value}
        hours={hours}
        onChange={onChange}
        onLeftFocus={() => hoursRef.current?.focus()}
        disabled={disabled}
        arrowStep={10}
        arrowStepEvent="keyup"
      />
      <Clock className="ml-1 size-4 shrink-0 text-muted-foreground" />
    </div>
  )
}
