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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAgenda } from "@/hooks/useAgenda"
import { usePatients } from "@/hooks/usePatients"
import { STATUS_META, todayISO } from "@/lib/clinic-data"
import type { AppointmentStatus } from "@/types/clinic"

const fieldControl =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function NewAppointmentDialog() {
  const { patients, createPatient } = usePatients()
  const { createAppointment, isCreating, createError } = useAgenda()
  const [open, setOpen] = React.useState(false)

  const [patientMode, setPatientMode] = React.useState<"existente" | "nuevo">(
    "existente",
  )
  const [patientId, setPatientId] = React.useState("")
  const [newPatientName, setNewPatientName] = React.useState("")
  const [date, setDate] = React.useState(todayISO)
  const [time, setTime] = React.useState("09:00")
  const [status, setStatus] = React.useState<AppointmentStatus>("pendiente")
  const [motivo, setMotivo] = React.useState("")

  function reset() {
    setPatientMode("existente")
    setPatientId("")
    setNewPatientName("")
    setDate(todayISO())
    setTime("09:00")
    setStatus("pendiente")
    setMotivo("")
  }

  const canSubmit =
    patientMode === "existente" ? !!patientId : newPatientName.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || isCreating) return

    // El alta rápida crea el expediente mínimo; el resto se completa desde
    // la ficha del paciente.
    const resolvedPatientId =
      patientMode === "existente"
        ? Number(patientId)
        : (
            await createPatient({
              name: newPatientName.trim(),
              age: "",
              gender: "",
              phone: "",
              email: "",
              address: "",
              cp: "",
              notes: "",
            })
          ).id

    await createAppointment({
      patientId: resolvedPatientId,
      date,
      time,
      status,
      motivo: motivo.trim() || "Consulta general",
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
          <Button size="sm">
            <Plus data-icon="inline-start" />
            Nueva Cita
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva cita</DialogTitle>
            <DialogDescription>
              Programa una cita para un paciente registrado o crea uno nuevo.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel>Paciente</FieldLabel>
              <Tabs
                value={patientMode}
                onValueChange={(v) => setPatientMode(v as "existente" | "nuevo")}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="existente" className="flex-1">
                    Existente
                  </TabsTrigger>
                  <TabsTrigger value="nuevo" className="flex-1">
                    Nuevo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="existente" className="pt-3">
                  <select
                    id="na-patient"
                    className={fieldControl}
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    required={patientMode === "existente"}
                  >
                    <option value="" disabled>
                      Selecciona un paciente
                    </option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </TabsContent>

                <TabsContent value="nuevo" className="pt-3">
                  <Input
                    id="na-new-patient"
                    placeholder="Nombre del nuevo paciente"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    required={patientMode === "nuevo"}
                  />
                </TabsContent>
              </Tabs>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="na-date">Fecha</FieldLabel>
                <Input
                  id="na-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="na-time">Hora</FieldLabel>
                <Input
                  id="na-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="na-status">Estatus</FieldLabel>
              <select
                id="na-status"
                className={fieldControl}
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              >
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="na-motivo">Motivo</FieldLabel>
              <Input
                id="na-motivo"
                placeholder="Ej. Limpieza dental"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </Field>

            {createError && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {createError instanceof Error
                  ? createError.message
                  : "No se pudo crear la cita."}
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
            <Button type="submit" disabled={!canSubmit || isCreating}>
              {isCreating ? "Guardando..." : "Guardar cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
