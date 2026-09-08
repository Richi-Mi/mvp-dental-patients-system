"use client"

import * as React from "react"
import { useNavigate, useParams } from "react-router"
import {
  CalendarClock,
  Check,
  ClipboardList,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  X,
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
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditPatientDialog } from "@/components/custom/edit-patient-dialog"
import { usePatient, usePatients } from "@/hooks/usePatients"
import {
  STATUS_META,
  formatCurrency,
  formatDayName,
  formatLongDate,
  formatShortDate,
  todayISO,
  treatmentSaldo,
  treatmentsSaldo,
  treatmentsTotal,
} from "@/lib/clinic-data"
import { cn } from "@/lib/utils"

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
    addTreatment,
    isAddingTreatment,
    removeTreatment,
  } = usePatient(Number.isFinite(patientId) ? patientId : undefined)
  const { deletePatient, isDeleting } = usePatients()

  const [editing, setEditing] = React.useState(false)
  const [draftFecha, setDraftFecha] = React.useState(todayISO)
  const [draftTrat, setDraftTrat] = React.useState("")
  const [draftCosto, setDraftCosto] = React.useState("")
  const [draftACuenta, setDraftACuenta] = React.useState("")

  function resetDraft() {
    setDraftFecha(todayISO())
    setDraftTrat("")
    setDraftCosto("")
    setDraftACuenta("")
    setEditing(false)
  }

  async function handleAddTreatment() {
    const costoNum = Number(draftCosto) || 0
    if (!draftTrat.trim() || costoNum <= 0) return
    await addTreatment({
      fecha: draftFecha,
      tratamiento: draftTrat.trim(),
      costo: costoNum,
      aCuenta: Math.min(Number(draftACuenta) || 0, costoNum),
    })
    resetDraft()
  }

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

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Control de tratamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tratamiento</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">A cuenta</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {treatments.map((t) => {
                  const saldo = treatmentSaldo(t)
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatShortDate(t.fecha)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {t.tratamiento}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(t.costo)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(t.aCuenta)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          saldo > 0 ? "text-rose-600" : "text-emerald-600",
                        )}
                      >
                        {formatCurrency(saldo)}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => void removeTreatment(t.id)}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          aria-label={`Eliminar ${t.tratamiento}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {editing ? (
                  <TableRow className="bg-primary/5">
                    <TableCell className="whitespace-nowrap">
                      <Input
                        type="date"
                        value={draftFecha}
                        onChange={(e) => setDraftFecha(e.target.value)}
                        className="h-8 w-32 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Tratamiento"
                        value={draftTrat}
                        onChange={(e) => setDraftTrat(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={draftCosto}
                        onChange={(e) => setDraftCosto(e.target.value)}
                        className="h-8 w-20 text-right text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={draftACuenta}
                        onChange={(e) => setDraftACuenta(e.target.value)}
                        className="h-8 w-20 text-right text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(
                        Math.max(
                          0,
                          (Number(draftCosto) || 0) - (Number(draftACuenta) || 0),
                        ),
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isAddingTreatment}
                          onClick={() => void handleAddTreatment()}
                          className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          aria-label="Guardar"
                        >
                          {isAddingTreatment ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={resetDraft}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          aria-label="Cancelar"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      resetDraft()
                      setEditing(true)
                    }}
                  >
                    <TableCell colSpan={6}>
                      <span className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Plus className="size-4" />
                        Nuevo registro
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-wrap justify-end gap-x-8 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Total tratamientos:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(treatmentsTotal(treatments))}
              </span>
            </span>
            <span className="text-muted-foreground">
              Saldo pendiente:{" "}
              <span className="font-medium tabular-nums text-rose-600">
                {formatCurrency(treatmentsSaldo(treatments))}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
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
