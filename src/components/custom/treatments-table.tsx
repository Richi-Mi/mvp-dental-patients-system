"use client"

import * as React from "react"
import { Loader2, Plus, Save, Trash2, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/custom/calendar"
import { useIsMobile } from "@/hooks/useMediaQuery"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatCurrency,
  todayISO,
  treatmentsBalance,
  treatmentsTotal,
} from "@/lib/clinic-data"
import { toNumber } from "@/lib/mappers"
import { MOBILE_CARD } from "@/lib/responsive"
import { cn } from "@/lib/utils"
import type { Treatment } from "@/types/clinic"

/** Fila en edición: los importes se mantienen como texto mientras se captura. */
type Row = {
  key: string
  fecha: string
  tratamiento: string
  costo: string
  aCuenta: string
}

let rowCounter = 0

function newRow(): Row {
  rowCounter += 1
  return {
    key: `nueva-${rowCounter}`,
    fecha: todayISO(),
    tratamiento: "",
    costo: "",
    aCuenta: "",
  }
}

function toRows(treatments: Treatment[]): Row[] {
  // El backend arma el id como `${id_paciente}-${fecha}`, así que dos
  // tratamientos del mismo día lo repiten: el índice desempata la key.
  return treatments.map((t, index) => ({
    key: `${t.id || "t"}#${index}`,
    fecha: t.fecha,
    tratamiento: t.tratamiento,
    costo: String(t.costo),
    aCuenta: String(t.aCuenta),
  }))
}

/** Filas con nombre, ya normalizadas a números para el backend. */
function toTreatments(rows: Row[]): Treatment[] {
  return rows
    .filter((row) => row.tratamiento.trim() !== "")
    .map((row) => ({
      id: row.key,
      fecha: row.fecha,
      tratamiento: row.tratamiento.trim(),
      costo: toNumber(row.costo),
      aCuenta: toNumber(row.aCuenta),
    }))
}

/** Firma para detectar cambios; ignora los ids. */
function signature(treatments: Treatment[]): string {
  return JSON.stringify(
    treatments.map((t) => [t.fecha, t.tratamiento, t.costo, t.aCuenta]),
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1 font-medium text-xs">
      {children}
    </kbd>
  )
}

export type TreatmentsTableProps = {
  treatments: Treatment[]
  /** Recibe la lista final completa: `PUT /pacientes/:id` la reemplaza entera. */
  onSave: (treatments: Treatment[]) => Promise<unknown>
  isSaving: boolean
  saveError?: unknown
}

export function TreatmentsTable({
  treatments,
  onSave,
  isSaving,
  saveError,
}: TreatmentsTableProps) {
  const savedSignature = signature(treatments)
  const [rows, setRows] = React.useState(() => toRows(treatments))
  const [syncedSignature, setSyncedSignature] = React.useState(savedSignature)
  const focusRowKey = React.useRef<string | null>(null)
  // En teléfono las filas se vuelven tarjetas: la tabla de 5 columnas no cabe.
  const isMobile = useIsMobile()

  // Cuando el servidor devuelve otra lista (al guardar o al cambiar de
  // paciente) la tabla se re-sincroniza. Ajustar el estado durante el render
  // es el patrón que recomienda React; con un efecto habría un render de más.
  if (savedSignature !== syncedSignature) {
    setSyncedSignature(savedSignature)
    setRows(toRows(treatments))
  }

  const pending = toTreatments(rows)
  const isDirty = signature(pending) !== savedSignature

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
  }

  function addRowAfter(key?: string) {
    const row = newRow()
    focusRowKey.current = row.key
    setRows((prev) => {
      const index = key ? prev.findIndex((r) => r.key === key) : -1
      if (index === -1) return [...prev, row]
      return [...prev.slice(0, index + 1), row, ...prev.slice(index + 1)]
    })
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((row) => row.key !== key))
  }

  function handleSave() {
    if (!isDirty || isSaving) return
    void onSave(pending)
  }

  /**
   * En el selector de fecha, Enter le toca al popover (abre el calendario),
   * así que ahí solo se atiende Shift + Enter.
   */
  function handleDateKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" || !event.shiftKey) return
    event.preventDefault()
    handleSave()
  }

  /** Enter abre una fila nueva debajo; Shift + Enter guarda todo. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, key: string) {
    if (event.key !== "Enter") return
    event.preventDefault()

    if (event.shiftKey) {
      handleSave()
      return
    }
    addRowAfter(key)
  }

  /** El ref enfoca la fila recién agregada (Enter o "Nuevo registro"). */
  function focusIfNew(el: HTMLInputElement | null, key: string) {
    if (el && focusRowKey.current === key) {
      focusRowKey.current = null
      el.focus()
    }
  }

  // En teléfono van al final de la lista, donde termina la captura.
  const actions = (
    <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:*:flex-1">
      {isDirty && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRows(toRows(treatments))}
          disabled={isSaving}
        >
          <Undo2 data-icon="inline-start" />
          Descartar
        </Button>
      )}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!isDirty || isSaving}
      >
        {isSaving ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <Save data-icon="inline-start" />
        )}
        {isSaving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )

  return (
    <Card className={cn("border-border/70", MOBILE_CARD)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-64 flex-1 max-sm:min-w-0">
            <CardTitle className="text-base">Control de tratamiento</CardTitle>
            <CardDescription>
              Edita las filas y guarda todos los cambios juntos.
              {/* Los atajos de teclado no aplican en pantallas táctiles. */}
              <span className="max-lg:hidden">
                {" "}Pulsa <Kbd>Enter</Kbd> para agregar otra fila y{" "}
                <Kbd>Shift + Enter</Kbd> para guardar.
              </span>
            </CardDescription>
          </div>

          {!isMobile && actions}
        </div>
      </CardHeader>

      <CardContent>
        {saveError != null && (
          <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {saveError instanceof Error
              ? saveError.message
              : "No se pudieron guardar los tratamientos."}
          </p>
        )}

        {isMobile ? (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 p-3"
              >
                <div className="flex items-center gap-2">
                  <DatePicker
                    value={row.fecha}
                    onChange={(fecha) => updateRow(row.key, { fecha })}
                    isDateDisabled={() => false}
                    format="short"
                    aria-label="Fecha"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.key)}
                    className="text-muted-foreground hover:text-rose-600"
                    aria-label={`Eliminar ${row.tratamiento || "registro"}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Input
                  ref={(el) => focusIfNew(el, row.key)}
                  placeholder="Tratamiento"
                  value={row.tratamiento}
                  onChange={(e) =>
                    updateRow(row.key, { tratamiento: e.target.value })
                  }
                  onKeyDown={(e) => handleKeyDown(e, row.key)}
                  aria-label="Tratamiento"
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Costo
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={row.costo}
                      onChange={(e) => updateRow(row.key, { costo: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, row.key)}
                      className="text-right"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    A cuenta
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={row.aCuenta}
                      onChange={(e) =>
                        updateRow(row.key, { aCuenta: e.target.value })
                      }
                      onKeyDown={(e) => handleKeyDown(e, row.key)}
                      className="text-right"
                    />
                  </label>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="border-dashed text-primary"
              onClick={() => addRowAfter()}
            >
              <Plus data-icon="inline-start" />
              Nuevo registro
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="w-40">Fecha</TableHead>
                  <TableHead>Tratamiento</TableHead>
                  <TableHead className="w-28 text-right">Costo</TableHead>
                  <TableHead className="w-28 text-right">A cuenta</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key} className="hover:bg-transparent">
                    <TableCell className="whitespace-nowrap">
                      <DatePicker
                        value={row.fecha}
                        onChange={(fecha) => updateRow(row.key, { fecha })}
                        onKeyDown={handleDateKeyDown}
                        // Un tratamiento registra algo que ya ocurrió: no se
                        // limita a los días de atención como sí hacen las citas.
                        isDateDisabled={() => false}
                        format="short"
                        aria-label="Fecha"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        ref={(el) => focusIfNew(el, row.key)}
                        placeholder="Tratamiento"
                        value={row.tratamiento}
                        onChange={(e) =>
                          updateRow(row.key, { tratamiento: e.target.value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, row.key)}
                        aria-label="Tratamiento"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={row.costo}
                        onChange={(e) => updateRow(row.key, { costo: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, row.key)}
                        aria-label="Costo"
                        className="h-8 text-right text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={row.aCuenta}
                        onChange={(e) =>
                          updateRow(row.key, { aCuenta: e.target.value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, row.key)}
                        aria-label="A cuenta"
                        className="h-8 text-right text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-rose-600 max-lg:size-11"
                        aria-label={`Eliminar ${row.tratamiento || "registro"}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => addRowAfter()}
                >
                  <TableCell colSpan={5}>
                    <span className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Plus className="size-4" />
                      Nuevo registro
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-x-8 gap-y-1 text-sm max-sm:flex-col max-sm:items-stretch">
          {isDirty && (
            <span className="mr-auto text-xs text-amber-600 max-sm:mr-0">
              Hay cambios sin guardar.
            </span>
          )}
          <span className="text-muted-foreground max-sm:flex max-sm:justify-between">
            Total tratamientos:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatCurrency(treatmentsTotal(pending))}
            </span>
          </span>
          <span className="text-muted-foreground max-sm:flex max-sm:justify-between">
            Saldo pendiente:{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                treatmentsBalance(pending) > 0
                  ? "text-rose-600"
                  : "text-emerald-600",
              )}
            >
              {formatCurrency(treatmentsBalance(pending))}
            </span>
          </span>
        </div>

        {isMobile && <div className="mt-4">{actions}</div>}
      </CardContent>
    </Card>
  )
}
