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
  type LucideIcon,
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

type Metric = {
  label: string
  value: string
  hint: string
  icon: LucideIcon
}

/** Sin datos (cargando o con error) se muestra "—" en vez de un cero engañoso. */
const EMPTY_VALUE = "—"

export function DashboardView() {
  const year = new Date().getFullYear()
  const { metrics: data, isFetching, error } = useDashboard(year)

  const money = (value: number | undefined) =>
    data && value !== undefined ? formatCurrency(value) : EMPTY_VALUE
  const count = (value: number | undefined) =>
    data && value !== undefined ? String(value) : EMPTY_VALUE

  const moneyMetrics: Metric[] = [
    {
      label: "Ventas totales",
      value: money(data?.ventasTotales),
      hint: `Tratamientos de ${year}`,
      icon: DollarSign,
    },
    {
      label: "Dinero a cuenta",
      value: money(data?.dineroACuenta),
      hint: "Abonos recibidos",
      icon: Wallet,
    },
    {
      label: "Dinero por cobrar",
      value: money(data?.dineroPorCobrar),
      hint: "Saldo pendiente de los pacientes",
      icon: HandCoins,
    },
  ]

  const activityMetrics: Metric[] = [
    {
      label: "Consultas totales",
      value: count(data?.consultasTotales),
      hint: `Citas registradas en ${year}`,
      icon: Stethoscope,
    },
    {
      label: "Pacientes totales",
      value: count(data?.pacientesTotales),
      // El backend no acota este dato por año: es el histórico de activos.
      hint: "Expedientes activos (histórico)",
      icon: Users,
    },
  ]

  const salesData = salesSeries(data?.ventasPorMes ?? [])
  const apptData = appointmentsSeries(data?.citasPorMes ?? [])

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
        {isFetching && (
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

      {/* 1. Dinero */}
      <div className="grid gap-4 sm:grid-cols-3">
        {moneyMetrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {/* 2. Ventas por mes */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Ventas por mes</CardTitle>
          <CardDescription>Ingresos por tratamientos (MXN)</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={salesConfig} className="h-72 w-full">
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

      {/* 3. Actividad */}
      <div className="grid gap-4 sm:grid-cols-2">
        {activityMetrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {/* 4. Citas por mes */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Citas por mes</CardTitle>
          <CardDescription>Número de citas agendadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={apptConfig} className="h-72 w-full">
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
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>{metric.label}</CardDescription>
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        </div>
        <CardTitle className="text-3xl font-semibold tabular-nums">
          {metric.value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{metric.hint}</p>
      </CardContent>
    </Card>
  )
}
