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
import {
  DollarSign,
  HandCoins,
  Loader2,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react"

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
import { useDashboard } from "@/hooks/useDashboard"
import {
  appointmentsSeries,
  formatCompactCurrency,
  formatCurrency,
  salesSeries,
} from "@/lib/clinic-data"

const salesConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
} satisfies ChartConfig

const apptConfig = {
  citas: { label: "Citas", color: "var(--chart-2)" },
} satisfies ChartConfig

export function DashboardView() {
  const year = new Date().getFullYear()
  const { metrics: data, isLoading, isFetching, error } = useDashboard(year)

  const salesData = React.useMemo(
    () => salesSeries(data?.ventasPorMes ?? []),
    [data?.ventasPorMes],
  )
  const apptData = React.useMemo(
    () => appointmentsSeries(data?.citasPorMes ?? []),
    [data?.citasPorMes],
  )

  const metrics = [
    {
      label: "Ventas totales",
      value: formatCurrency(data?.ventasTotales ?? 0),
      hint: `Tratamientos de ${year}`,
      icon: DollarSign,
    },
    {
      label: "Dinero a cuenta",
      value: formatCurrency(data?.dineroACuenta ?? 0),
      hint: "Abonos recibidos",
      icon: Wallet,
    },
    {
      label: "Dinero por cobrar",
      value: formatCurrency(data?.dineroPorCobrar ?? 0),
      hint: "Saldo pendiente de los pacientes",
      icon: HandCoins,
    },
    {
      label: "Consultas totales",
      value: String(data?.consultasTotales ?? 0),
      hint: `Citas registradas en ${year}`,
      icon: Stethoscope,
    },
    {
      label: "Pacientes totales",
      value: String(data?.pacientesTotales ?? 0),
      // El backend no acota este dato por año: es el histórico de activos.
      hint: "Expedientes activos (histórico)",
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
        {(isLoading || isFetching) && (
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

      <div className="flex flex-wrap justify-center gap-4">
        {metrics.map((m) => (
          <Card
            key={m.label}
            className="w-full border-border/70 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
          >
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
                  tickFormatter={formatCompactCurrency}
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
