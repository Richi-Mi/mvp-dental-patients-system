"use client"

import * as React from "react"
import { Pencil } from "lucide-react"

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
import type { Patient } from "@/types/clinic"

const fieldControl =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function toForm(patient: Patient) {
  return {
    name: patient.name,
    age: patient.age ? String(patient.age) : "",
    gender: patient.gender || "Femenino",
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    cp: patient.cp,
    notes: patient.notes,
  }
}

export function EditPatientDialog({ patient }: { patient: Patient }) {
  const { updatePatient, isUpdating } = usePatient(patient.id)
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState(() => toForm(patient))
  const [error, setError] = React.useState<string | null>(null)

  const set = (key: keyof ReturnType<typeof toForm>) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || isUpdating) return
    try {
      await updatePatient({ ...form, name: form.name.trim() })
      setOpen(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el paciente.",
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Al abrir se recarga el formulario con los datos vigentes.
        if (next) {
          setForm(toForm(patient))
          setError(null)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Pencil data-icon="inline-start" />
            Editar
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
            <DialogDescription>
              Actualiza la información del expediente del paciente.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="ep-name">Nombre</FieldLabel>
              <Input
                id="ep-name"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="ep-age">Edad</FieldLabel>
                <Input
                  id="ep-age"
                  type="number"
                  min="0"
                  value={form.age}
                  onChange={(e) => set("age")(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ep-gender">Sexo</FieldLabel>
                <select
                  id="ep-gender"
                  className={fieldControl}
                  value={form.gender}
                  onChange={(e) => set("gender")(e.target.value)}
                >
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="ep-phone">Teléfono</FieldLabel>
                <Input
                  id="ep-phone"
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ep-cp">Código postal</FieldLabel>
                <Input
                  id="ep-cp"
                  value={form.cp}
                  onChange={(e) => set("cp")(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ep-email">Correo</FieldLabel>
              <Input
                id="ep-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ep-address">Dirección</FieldLabel>
              <Input
                id="ep-address"
                value={form.address}
                onChange={(e) => set("address")(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ep-notes">Notas</FieldLabel>
              <Input
                id="ep-notes"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
              />
            </Field>

            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
          </FieldGroup>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={!form.name.trim() || isUpdating}>
              {isUpdating ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
