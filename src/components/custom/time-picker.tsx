"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Time picker por segmentos, al estilo de https://time.openstatus.dev:
 * sin librerías extra, gobernado por `keydown` (flechas para subir/bajar y
 * para moverse entre campos), con avance automático al segundo dígito y
 * teclado numérico en móvil.
 *
 * Trabaja sobre un string `HH:mm` en 24 h, que es el formato que usa el resto
 * de la app (`Appointment.time`).
 */

type Segment = "hours" | "minutes"

// El consultorio solo atiende de 10 a 20 h: el segmento de horas no admite
// nada fuera de ese rango.
const MIN_VALUE: Record<Segment, number> = { hours: 10, minutes: 0 }
const MAX_VALUE: Record<Segment, number> = { hours: 20, minutes: 59 }

/** Deja el valor en dos dígitos dentro del rango del segmento. */
function clampSegment(value: string, segment: Segment, loop = false): string {
  const min = MIN_VALUE[segment]
  const max = MAX_VALUE[segment]
  let numeric = Number.parseInt(value, 10)
  if (Number.isNaN(numeric)) return String(min).padStart(2, "0")

  if (loop) {
    if (numeric > max) numeric = min
    if (numeric < min) numeric = max
  } else {
    numeric = Math.min(Math.max(numeric, min), max)
  }
  return String(numeric).padStart(2, "0")
}

function splitTime(time: string): Record<Segment, string> {
  const [hours = "00", minutes = "00"] = time.split(":")
  return {
    hours: clampSegment(hours, "hours"),
    minutes: clampSegment(minutes, "minutes"),
  }
}

type TimeSegmentProps = {
  id?: string
  segment: Segment
  label: string
  value: string
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
  onChange,
  onLeftFocus,
  onRightFocus,
  ref,
  disabled,
  arrowStep = 1,
  arrowStepEvent = "keydown",
}: TimeSegmentProps) {
  // Marca que ya se escribió el primer dígito del par (p. ej. "0" -> "09").
  const [halfTyped, setHalfTyped] = React.useState(false)

  const parts = splitTime(value)
  const current = parts[segment]

  // Si el usuario se detiene, el siguiente dígito vuelve a empezar el par.
  React.useEffect(() => {
    if (!halfTyped) return
    const timer = setTimeout(() => setHalfTyped(false), 2000)
    return () => clearTimeout(timer)
  }, [halfTyped])

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
      setHalfTyped(false)
      commit(clampSegment(String(Number(current) + step), segment, true))
      return
    }

    if (event.key >= "0" && event.key <= "9") {
      const next = halfTyped ? `${current[1]}${event.key}` : `0${event.key}`
      commit(clampSegment(next, segment))
      if (halfTyped) onRightFocus?.()
      setHalfTyped(!halfTyped)
    }
  }

  function handleKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
    if (arrowStepEvent !== "keyup") return
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return

    const step = event.key === "ArrowUp" ? arrowStep : -arrowStep
    setHalfTyped(false)
    commit(clampSegment(String(Number(current) + step), segment, true))
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
  disabled?: boolean
  className?: string
}

export function TimePicker({
  id,
  value,
  onChange,
  disabled,
  className,
}: TimePickerProps) {
  const hoursRef = React.useRef<HTMLInputElement>(null)
  const minutesRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <TimeSegment
        id={id}
        ref={hoursRef}
        segment="hours"
        label="Horas"
        value={value}
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
        label="Minutos"
        value={value}
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
