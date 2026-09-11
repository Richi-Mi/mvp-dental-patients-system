"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  formatCompactDate,
  formatLongDate,
  isClosedDay,
  monthGridDates,
  monthKey,
  parseISO,
  todayISO,
} from "@/lib/clinic-data"
import { cn } from "@/lib/utils"

const WEEKDAY_HEADERS = ["L", "M", "X", "J", "V", "S", "D"]

const MONTHS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

export type CalendarProps = {
  /** Fecha seleccionada (`yyyy-mm-dd`). */
  value?: string
  onSelect?: (date: string) => void
  /** Días no seleccionables (por defecto, los días sin atención). */
  isDateDisabled?: (date: string) => boolean
  className?: string
}

/**
 * Calendario mensual. El mes visible es estado interno y arranca en el de
 * `value` (o el mes actual), así que basta con remontarlo para reiniciarlo.
 */
export function Calendar({
  value,
  onSelect,
  isDateDisabled = isClosedDay,
  className,
}: CalendarProps) {
  const [view, setView] = React.useState(() => {
    const base = value ? parseISO(value) : new Date()
    return { year: base.getFullYear(), month: base.getMonth() + 1 }
  })

  const dates = monthGridDates(view.year, view.month)
  const currentMonth = monthKey(view.year, view.month)
  const today = todayISO()

  function shiftMonth(delta: number) {
    setView((prev) => {
      const date = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() + 1 }
    })
  }

  return (
    <div className={cn("w-72 select-none", className)}>
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => shiftMonth(-1)}
          aria-label="Mes anterior"
        >
          <ChevronLeft />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {MONTHS_LONG[view.month - 1]} {view.year}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-xs text-muted-foreground">
        {WEEKDAY_HEADERS.map((label, i) => (
          <span key={`${label}-${i}`} className="py-1 font-medium">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {dates.map((date) => {
          const outside = !date.startsWith(currentMonth)
          const disabled = isDateDisabled(date)
          const selected = date === value
          const isToday = date === today

          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              aria-label={formatLongDate(date)}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={selected}
              onClick={() => onSelect?.(date)}
              className={cn(
                "flex h-9 items-center justify-center rounded-md text-sm transition-colors",
                "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                outside ? "text-muted-foreground/50" : "text-foreground",
                isToday && !selected && "font-semibold text-primary",
                selected &&
                  "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                disabled &&
                  "cursor-not-allowed text-muted-foreground/40 line-through hover:bg-transparent",
                !disabled && "cursor-pointer",
              )}
            >
              {parseISO(date).getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type DatePickerProps = {
  id?: string
  value: string
  onChange: (date: string) => void
  isDateDisabled?: (date: string) => boolean
  placeholder?: string
  /** `short` ("8 Sep 2026") para espacios estrechos como una celda de tabla. */
  format?: "long" | "short"
  /** Se ejecuta antes de que el trigger abra el calendario. */
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
  className?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

/** Campo de fecha con calendario en un popover. */
export function DatePicker({
  id,
  value,
  onChange,
  isDateDisabled = isClosedDay,
  placeholder = "Selecciona una fecha",
  format = "long",
  onKeyDown,
  className,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        render={
          <button
            id={id}
            type="button"
            onKeyDown={onKeyDown}
            {...aria}
            className={cn(
              "flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
              className,
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value
                ? format === "short"
                  ? formatCompactDate(value)
                  : formatLongDate(value)
                : placeholder}
            </span>
          </button>
        }
      />
      <PopoverPrimitive.Portal>
        {/* Por encima del diálogo de nueva cita, que se monta en z-50. */}
        <PopoverPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          className="isolate z-60"
        >
          <PopoverPrimitive.Popup className="z-60 rounded-xl border border-border/70 bg-popover p-3 text-popover-foreground shadow-md outline-none">
            <Calendar
              value={value}
              isDateDisabled={isDateDisabled}
              onSelect={(date) => {
                onChange(date)
                setOpen(false)
              }}
            />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
