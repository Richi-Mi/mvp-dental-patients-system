"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { usePatient } from "@/hooks/usePatients"
import { todayISO } from "@/lib/clinic-data"

export function AddTreatmentDialog({ patientId }: { patientId: number }) {
  const { addTreatment, isAddingTreatment } = usePatient(patientId)
  const [open, setOpen] = React.useState(false)

  const [fecha, setFecha] = React.useState(todayISO)
  const [tratamiento, setTratamiento] = React.useState("")
  const [costo, setCosto] = React.useState("")
  const [aCuenta, setACuenta] = React.useState("")

  function reset() {
    setFecha(todayISO())
    setTratamiento("")
    setCosto("")
    setACuenta("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const costoNum = Number(costo) || 0
    if (!tratamiento.trim() || costoNum <= 0 || isAddingTreatment) return
    await addTreatment({
      fecha,
      tratamiento: tratamiento.trim(),
      costo: costoNum,
      aCuenta: Math.min(Number(aCuenta) || 0, costoNum),
    })
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus data-icon="inline-start" />
            Agregar tratamiento
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo tratamiento</DialogTitle>
            <DialogDescription>
              Registra un tratamiento en el control del paciente.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="at-fecha">Fecha</FieldLabel>
              <Input
                id="at-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="at-trat">Tratamiento</FieldLabel>
              <Input
                id="at-trat"
                placeholder="Ej. Limpieza dental"
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="at-costo">Costo</FieldLabel>
                <Input
                  id="at-costo"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="at-cuenta">A cuenta</FieldLabel>
                <Input
                  id="at-cuenta"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={aCuenta}
                  onChange={(e) => setACuenta(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={isAddingTreatment}>
              {isAddingTreatment ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
