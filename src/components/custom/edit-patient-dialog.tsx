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
import type { Patient } from "@/lib/clinic-data"
import { useClinic } from "@/context/ClinicProvider"

const fieldControl =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function EditPatientDialog({ patient }: { patient: Patient }) {
  const { updatePatient } = useClinic()
  const [open, setOpen] = React.useState(false)

  const [name, setName] = React.useState(patient.name)
  const [age, setAge] = React.useState(String(patient.age))
  const [gender, setGender] = React.useState<Patient["gender"]>(patient.gender)
  const [phone, setPhone] = React.useState(patient.phone)
  const [email, setEmail] = React.useState(patient.email)
  const [address, setAddress] = React.useState(patient.address)
  const [notes, setNotes] = React.useState(patient.notes)

  React.useEffect(() => {
    if (open) {
      setName(patient.name)
      setAge(String(patient.age))
      setGender(patient.gender)
      setPhone(patient.phone)
      setEmail(patient.email)
      setAddress(patient.address)
      setNotes(patient.notes)
    }
  }, [open, patient])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    updatePatient(patient.id, {
      name: name.trim(),
      age: Number(age) || 0,
      gender,
      phone,
      email,
      address,
      notes,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ep-gender">Género</FieldLabel>
                <select
                  id="ep-gender"
                  className={fieldControl}
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value as Patient["gender"])
                  }
                  required
                >
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                </select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ep-phone">Teléfono</FieldLabel>
              <Input
                id="ep-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ep-email">Correo</FieldLabel>
              <Input
                id="ep-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ep-address">Dirección</FieldLabel>
              <Input
                id="ep-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ep-notes">Notas</FieldLabel>
              <Input
                id="ep-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline">Cancelar</Button>}
            />
            <Button type="submit" disabled={!name.trim()}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}