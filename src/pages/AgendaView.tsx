"use client"

import * as React from "react"
import { Search, Clock, CalendarDays, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

import {
  STATUS_META,
  formatDayName,
  formatLongDate,
  parseISO,
} from "@/lib/clinic-data"
import { TODAY, useClinic } from "@/context/ClinicProvider"
import { NewAppointmentDialog } from "@/components/custom/new-appointment-dialog"

export function AgendaView() {
  const { appointments, getPatient } = useClinic()
  const [query, setQuery] = React.useState("")

  const upcoming = React.useMemo(() => {
    const today = parseISO(TODAY).getTime()
    return appointments
      .map((a) => ({ appt: a, patient: getPatient(a.patientId) }))
      .filter(({ appt, patient }) => {
        if (!patient) return false
        if (parseISO(appt.date).getTime() < today) return false
        return patient.name.toLowerCase().includes(query.trim().toLowerCase())
      })
      .sort((a, b) =>
        a.appt.date === b.appt.date
          ? a.appt.time.localeCompare(b.appt.time)
          : a.appt.date.localeCompare(b.appt.date),
      )
  }, [appointments, getPatient, query])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="text-sm text-muted-foreground">
            Próximas citas programadas en el consultorio.
          </p>
        </div>
        <NewAppointmentDialog />
      </div>

      <InputGroup className="max-w-md">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Buscar paciente por nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar paciente"
        />
      </InputGroup>

      {upcoming.length === 0 ? (
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Sin citas próximas</EmptyTitle>
            <EmptyDescription>
              No se encontraron citas que coincidan con tu búsqueda.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {upcoming.map(({ appt, patient }) => {
            const status = STATUS_META[appt.status]
            return (
              <Card
                key={appt.id}
                className="overflow-hidden border-border/70 transition-shadow hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-4 p-0">
                  <div className="flex items-center justify-between gap-3 bg-primary/5 px-5 py-3">
                    <div className="flex items-center gap-2 text-primary">
                      <CalendarDays className="size-4" />
                      <span className="text-sm font-medium capitalize">
                        {formatDayName(appt.date)}
                      </span>
                    </div>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>

                  <div className="flex flex-col gap-4 px-5 pb-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatLongDate(appt.date)}</span>
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Clock className="size-4 text-primary" />
                        {appt.time} h
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {patient!.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {patient!.age} años · {patient!.gender}
                        </p>
                      </div>
                    </div>

                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {appt.motivo}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
