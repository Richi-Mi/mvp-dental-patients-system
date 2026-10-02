import { CLOSING_HOUR, OPENING_HOUR } from "@/lib/clinic-data"

export type Segment = "hours" | "minutes"

/** Horas (24 h) que admite el segmento de horas, ambas incluidas. */
export type HourRange = { min: number; max: number }

// Por defecto, el horario de `clinic-data.ts` (hoy, de 10 a 20 h): el segmento
// de horas no admite nada fuera de ese rango.
export const OPENING_HOURS: HourRange = { min: OPENING_HOUR, max: CLOSING_HOUR }

const MINUTES: HourRange = { min: 0, max: 59 }

function limitsOf(segment: Segment, hours: HourRange): HourRange {
  return segment === "hours" ? hours : MINUTES
}

/** Deja el valor en dos dígitos dentro del rango del segmento. */
export function clampSegment(
  value: string,
  segment: Segment,
  loop = false,
  hours: HourRange = OPENING_HOURS,
): string {
  const { min, max } = limitsOf(segment, hours)
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

export function splitTime(
  time: string,
  hours: HourRange = OPENING_HOURS,
): Record<Segment, string> {
  const [hh = "00", mm = "00"] = time.split(":")
  return {
    hours: clampSegment(hh, "hours", false, hours),
    minutes: clampSegment(mm, "minutes"),
  }
}

export type DigitResult = {
  /** Valor de dos dígitos que queda en el segmento. */
  value: string
  /** Primer dígito tecleado a la espera del segundo; `null` si el par cerró. */
  pending: string | null
  /** El par quedó completo: hay que pasar al siguiente campo. */
  advance: boolean
}

/**
 * Aplica un dígito tecleado a un segmento.
 *
 * El primer dígito se guarda tal cual en `pending` (el valor mostrado sí se
 * ajusta al rango, pero nunca se usa para armar el segundo dígito: si no, en
 * horas `1` -> `10` y el siguiente dígito se sumaría al `0` en vez de al `1`).
 * Un primer dígito que no puede iniciar un par válido (p. ej. `7` en minutos)
 * cierra el par solo.
 */
export function typeDigit(
  segment: Segment,
  pending: string | null,
  digit: string,
  hours: HourRange = OPENING_HOURS,
): DigitResult {
  if (pending !== null) {
    return {
      value: clampSegment(`${pending}${digit}`, segment, false, hours),
      pending: null,
      advance: true,
    }
  }

  const value = clampSegment(`0${digit}`, segment, false, hours)
  const canStartPair = Number(digit) * 10 <= limitsOf(segment, hours).max
  return canStartPair
    ? { value, pending: digit, advance: false }
    : { value, pending: null, advance: true }
}
