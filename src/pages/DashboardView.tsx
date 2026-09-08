"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { DollarSign, Loader2, Stethoscope, Users } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useAgendaYear } from "@/hooks/useAgenda"
import { usePatientsWithTreatments } from "@/hooks/usePatients"
import {
  appointmentsByMonth,
  formatCurrency,
  salesByMonth,
  treatmentsTotal,
} from "@/lib/clinic-data"

const salesConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
} satisfies ChartConfig

const apptConfig = {
  citas: { label: "Citas", color: "var(--chart-2)" },
} satisfies ChartConfig

export function DashboardView() {
  const year = new Date().getFullYear()
  const {
    patients,
    total: pacientesTotales,
    isLoading: loadingPatients,
    error: patientsError,
  } = usePatientsWithTreatments()
  const {
    appointments,
    isLoading: loadingAppointments,
    error: appointmentsError,
  } = useAgendaYear(year)

  const ventasTotales = React.useMemo(
    () => patients.reduce((sum, p) => sum + treatmentsTotal(p.treatments), 0),
    [patients],
  )

  const salesData = React.useMemo(() => salesByMonth(patients), [patients])
  const apptData = React.useMemo(
    () => appointmentsByMonth(appointments),
    [appointments],
  )

  const isLoading = loadingPatients || loadingAppointments
  const error = patientsError ?? appointmentsError

  const metrics = [
    {
      label: "Ventas totales",
      value: formatCurrency(ventasTotales),
      hint: "Acumulado de tratamientos",
      icon: DollarSign,
    },
    {
      label: "Consultas totales",
      value: appointments.length.toString(),
      hint: `Citas registradas en ${year}`,
      icon: Stethoscope,
    },
    {
      label: "Pacientes totales",
      value: pacientesTotales.toString(),
      hint: "Expedientes activos",
      icon: Users,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Métricas clave del consultorio en {year}.
          </p>
        </div>
        {isLoading && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando...
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error instanceof Error
            ? error.message
            : "No se pudieron cargar las métricas."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label} className="border-border/70">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{m.label}</CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <m.icon className="size-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-semibold tabular-nums">
                {m.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{m.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Ventas por mes</CardTitle>
            <CardDescription>Ingresos por tratamientos (MXN)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesConfig} className="h-64 w-full">
              <BarChart data={salesData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />
                <Bar dataKey="ventas" fill="var(--color-ventas)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Citas por mes</CardTitle>
            <CardDescription>Número de citas agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={apptConfig} className="h-64 w-full">
              <LineChart data={apptData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="citas"
                  type="monotone"
                  stroke="var(--color-citas)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--color-citas)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
