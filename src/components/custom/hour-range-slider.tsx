import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { hourLabel } from "@/lib/clinic-data"
import { cn } from "@/lib/utils"

/** Nombre de cada manija para los lectores de pantalla, en orden. */
const THUMB_LABELS = ["Hora de apertura", "Última hora de la agenda"] as const

type HourRange = [opening: number, closing: number]

/**
 * Slider de dos manijas para un rango de horas (24 h): apertura y última hora.
 * Es el de `ui/slider.tsx` (mismo aspecto) más lo que ese no deja pasar a
 * cada manija: su nombre y su valor leído como hora ("10:00") para los
 * lectores de pantalla. Las manijas pueden coincidir (un horario de una hora)
 * pero no cruzarse.
 */
export function HourRangeSlider({
  value,
  min,
  max,
  disabled,
  onValueChange,
  onValueCommitted,
  className,
  ...aria
}: {
  value: HourRange
  min: number
  max: number
  disabled?: boolean
  onValueChange: (value: HourRange) => void
  onValueCommitted: (value: HourRange) => void
  className?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
}) {
  const toRange = (next: number | readonly number[]): HourRange =>
    Array.isArray(next) ? [next[0], next[1]] : [next as number, next as number]

  return (
    <SliderPrimitive.Root
      {...aria}
      className={cn("w-full", className)}
      data-slot="slider"
      value={value}
      min={min}
      max={max}
      step={1}
      largeStep={3}
      disabled={disabled}
      thumbAlignment="edge"
      thumbCollisionBehavior="none"
      onValueChange={(next) => onValueChange(toRange(next))}
      onValueCommitted={(next) => onValueCommitted(toRange(next))}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="h-full bg-primary select-none"
          />
        </SliderPrimitive.Track>
        {THUMB_LABELS.map((label, index) => (
          <SliderPrimitive.Thumb
            key={label}
            index={index}
            data-slot="slider-thumb"
            getAriaLabel={() => label}
            getAriaValueText={(_formatted, hour) => hourLabel(hour)}
            className="block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] select-none hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
