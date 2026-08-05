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
import type { AppointmentStatus } from "@/lib/clinic-data"
import { TODAY, useClinic } from "@/context/ClinicProvider"

const fieldControl =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function NewAppointmentDialog() {
  const { patients, addPatient, addAppointment } = useClinic()
  const [open, setOpen] = React.useState(false)

  const [patientMode, setPatientMode] = React.useState<"existente" | "nuevo">("existente")
  const [patientId, setPatientId] = React.useState("")
  const [newPatientName, setNewPatientName] = React.useState("")
  const [date, setDate] = React.useState(TODAY)
  const [time, setTime] = React.useState("09:00")
  const [status, setStatus] = React.useState<AppointmentStatus>("pendiente")
  const [motivo, setMotivo] = React.useState("")

  function reset() {
    setPatientMode("existente")
    setPatientId("")
    setNewPatientName("")
    setDate(TODAY)
    setTime("09:00")
    setStatus("pendiente")
    setMotivo("")
  }

  const canSubmit =
    patientMode === "existente" ? !!patientId : newPatientName.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const resolvedPatientId =
      patientMode === "existente"
        ? patientId
        : addPatient(newPatientName.trim())
    addAppointment({
      patientId: resolvedPatientId,
      date,
      time,
      status,
      motivo: motivo || "Consulta general",
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
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
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
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="submit" disabled={!canSubmit}>
              Guardar cita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}