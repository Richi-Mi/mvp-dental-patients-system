"use client"

import * as React from "react"
import { useNavigate } from "react-router"
import { UserPlus } from "lucide-react"

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
import { usePatients } from "@/hooks/usePatients"

const fieldControl =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const EMPTY = {
  name: "",
  age: "",
  gender: "Femenino",
  phone: "",
  email: "",
  address: "",
  cp: "",
  notes: "",
}

export function NewPatientDialog() {
  const { createPatient, isCreating, createError } = usePatients()
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY)

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || isCreating) return
    const patient = await createPatient({ ...form, name: form.name.trim() })
    setForm(EMPTY)
    setOpen(false)
    navigate(`/pacientes/${patient.id}`)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setForm(EMPTY)
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus data-icon="inline-start" />
            Nuevo paciente
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo paciente</DialogTitle>
            <DialogDescription>
              Crea el expediente y queda asignado a tu usuario.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="np-name">Nombre</FieldLabel>
              <Input
                id="np-name"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="np-age">Edad</FieldLabel>
                <Input
                  id="np-age"
                  type="number"
                  min="0"
                  value={form.age}
                  onChange={(e) => set("age")(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="np-gender">Sexo</FieldLabel>
                <select
                  id="np-gender"
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
                <FieldLabel htmlFor="np-phone">Teléfono</FieldLabel>
                <Input
                  id="np-phone"
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="np-cp">Código postal</FieldLabel>
                <Input
                  id="np-cp"
                  value={form.cp}
                  onChange={(e) => set("cp")(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="np-email">Correo</FieldLabel>
              <Input
                id="np-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="np-address">Dirección</FieldLabel>
              <Input
                id="np-address"
                value={form.address}
                onChange={(e) => set("address")(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="np-notes">Notas</FieldLabel>
              <Input
                id="np-notes"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
              />
            </Field>

            {createError && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {createError instanceof Error
                  ? createError.message
                  : "No se pudo crear el paciente."}
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
            <Button type="submit" disabled={!form.name.trim() || isCreating}>
              {isCreating ? "Creando..." : "Crear paciente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
