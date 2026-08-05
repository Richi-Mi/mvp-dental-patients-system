"use client"

import * as React from "react"
import {
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  CalendarClock,
  ClipboardList,
  Search,
  Plus,
  Check,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import {
  STATUS_META,
  formatCurrency,
  formatDayName,
  formatLongDate,
  formatShortDate,
  treatmentSaldo,
} from "@/lib/clinic-data"
import { TODAY, useClinic } from "@/context/ClinicProvider"
import { EditPatientDialog } from "@/components/custom/edit-patient-dialog"

export function PatientsView() {
  const { patients, getNextAppointment, addTreatment } = useClinic()
  const [selectedId, setSelectedId] = React.useState(patients[0]?.id ?? "")
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState(false)

  const [draftFecha, setDraftFecha] = React.useState(TODAY)
  const [draftTrat, setDraftTrat] = React.useState("")
  const [draftCosto, setDraftCosto] = React.useState("")
  const [draftACuenta, setDraftACuenta] = React.useState("")

  function resetDraft() {
    setDraftFecha(TODAY)
    setDraftTrat("")
    setDraftCosto("")
    setDraftACuenta("")
    setEditing(false)
  }

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const patient = patients.find((p) => p.id === selectedId) ?? patients[0]
  const nextAppt = patient ? getNextAppointment(patient.id) : undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pacientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Expedientes y control de tratamientos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* List */}
        <div className="flex flex-col gap-3">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar paciente..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar paciente"
            />
          </InputGroup>

          <div className="flex flex-col gap-2">
            {filtered.map((p) => {
              const active = patient?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/70 bg-card hover:bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-sm font-medium",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.age} años · {p.gender}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground/50",
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail */}
        {patient && (
          <div className="flex min-w-0 flex-col gap-4">
            <Card className="border-border/70">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{patient.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {patient.age} años · {patient.gender}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <EditPatientDialog patient={patient} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow icon={Phone} label="Teléfono" value={patient.phone} />
                  <InfoRow icon={Mail} label="Correo" value={patient.email} />
                  <InfoRow icon={MapPin} label="Dirección" value={patient.address} />
                  <InfoRow icon={ClipboardList} label="Notas" value={patient.notes} />
                </div>

                <Separator />

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <CalendarClock className="size-4 text-primary" />
                    Próxima cita
                  </div>
                  {nextAppt ? (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-primary/5 px-4 py-3 text-sm">
                      <span className="font-medium capitalize text-foreground">
                        {formatDayName(nextAppt.date)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatLongDate(nextAppt.date)}
                      </span>
                      <span className="font-medium text-foreground">
                        {nextAppt.time} h
                      </span>
                      <Badge className={STATUS_META[nextAppt.status].className}>
                        {STATUS_META[nextAppt.status].label}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    Control de tratamiento
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-border/70">
                  <Table className="min-w-[520px]">
                    <TableHeader>
                      <TableRow className="bg-muted/60">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tratamiento</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                        <TableHead className="text-right">A cuenta</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        {editing && <TableHead className="w-16" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patient.treatments.map((t) => {
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
                            {editing && <TableCell />}
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
                            {(() => {
                              const saldo =
                                Math.max(0, Number(draftCosto) || 0) -
                                Math.min(
                                  Number(draftACuenta) || 0,
                                  Number(draftCosto) || 0,
                                )
                              return formatCurrency(saldo)
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const costoNum = Number(draftCosto) || 0
                                  if (!draftTrat || costoNum <= 0) return
                                  addTreatment(patient.id, {
                                    fecha: draftFecha,
                                    tratamiento: draftTrat,
                                    costo: costoNum,
                                    aCuenta: Math.min(Number(draftACuenta) || 0, costoNum),
                                  })
                                  resetDraft()
                                }}
                                className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                aria-label="Guardar"
                              >
                                <Check className="size-3.5" />
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
                            setDraftFecha(TODAY)
                            setDraftTrat("")
                            setDraftCosto("")
                            setDraftACuenta("")
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
                    <span className="font-medium text-foreground tabular-nums">
                      {formatCurrency(
                        patient.treatments.reduce((s, t) => s + t.costo, 0),
                      )}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Saldo pendiente:{" "}
                    <span className="font-medium text-rose-600 tabular-nums">
                      {formatCurrency(
                        patient.treatments.reduce(
                          (s, t) => s + treatmentSaldo(t),
                          0,
                        ),
                      )}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
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
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}
