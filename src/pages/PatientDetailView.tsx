"use client"

import * as React from "react"
import { useNavigate, useParams } from "react-router"
import {
  CalendarClock,
  ClipboardList,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { EditPatientDialog } from "@/components/custom/edit-patient-dialog"
import { TreatmentsTable } from "@/components/custom/treatments-table"
import { usePatient, usePatients } from "@/hooks/usePatients"
import {
  STATUS_META,
  formatDayName,
  formatLongDate,
} from "@/lib/clinic-data"

export function PatientsEmptyView() {
  return (
    <Empty className="h-full rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyTitle>Selecciona un paciente</EmptyTitle>
        <EmptyDescription>
          Elige un expediente de la lista para ver su información y su control
          de tratamientos.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function PatientDetailView() {
  const params = useParams()
  const navigate = useNavigate()
  const patientId = Number(params.id)

  const {
    patient,
    treatments,
    nextAppointment,
    isLoading,
    error,
    saveTreatments,
    isSavingTreatments,
    saveTreatmentsError,
  } = usePatient(Number.isFinite(patientId) ? patientId : undefined)
  const { deletePatient, isDeleting } = usePatients()

  async function handleDeletePatient() {
    if (!patient) return
    if (
      !window.confirm(
        `¿Dar de baja a ${patient.name}? El expediente dejará de aparecer en la lista.`,
      )
    ) {
      return
    }
    await deletePatient(patient.id)
    navigate("/pacientes", { replace: true })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando expediente...
      </div>
    )
  }

  if (error || !patient) {
    return (
      <Empty className="rounded-xl border border-dashed">
        <EmptyHeader>
          <EmptyTitle>No se pudo cargar el expediente</EmptyTitle>
          <EmptyDescription>
            {error instanceof Error
              ? error.message
              : "El paciente no existe o fue dado de baja."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-xl">{patient.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {patient.age ? `${patient.age} años` : "Edad no registrada"}
                {patient.gender ? ` · ${patient.gender}` : ""}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <EditPatientDialog patient={patient} />
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeletePatient}
                disabled={isDeleting}
              >
                <Trash2 data-icon="inline-start" />
                Dar de baja
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={Phone} label="Teléfono" value={patient.phone} />
            <InfoRow icon={Mail} label="Correo" value={patient.email} />
            <InfoRow
              icon={MapPin}
              label="Dirección"
              value={[patient.address, patient.cp].filter(Boolean).join(", ")}
            />
            <InfoRow icon={ClipboardList} label="Notas" value={patient.notes} />
          </div>

          <Separator />

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarClock className="size-4 text-primary" />
              Próxima cita
            </div>
            {nextAppointment ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-primary/5 px-4 py-3 text-sm">
                <span className="font-medium capitalize text-foreground">
                  {formatDayName(nextAppointment.date)}
                </span>
                <span className="text-muted-foreground">
                  {formatLongDate(nextAppointment.date)}
                </span>
                <span className="font-medium text-foreground">
                  {nextAppointment.time} h
                </span>
                <Badge className={STATUS_META[nextAppointment.status].className}>
                  {STATUS_META[nextAppointment.status].label}
                </Badge>
              </div>
            ) : (
              <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                Sin citas próximas programadas.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <TreatmentsTable
        treatments={treatments}
        onSave={saveTreatments}
        isSaving={isSavingTreatments}
        saveError={saveTreatmentsError}
      />
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  )
}
