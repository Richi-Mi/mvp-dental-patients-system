import type { ReactNode } from "react"
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
  UserPlus,
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
  DASHBOARD_WHOLE_YEAR,
  formatCompactCurrency,
  formatCurrency,
  formatDashboardPeriod,
  MONTH_OPTIONS,
  salesSeries,
  type DashboardPeriod,
} from "@/lib/clinic-data"
import { MOBILE_CARD } from "@/lib/responsive"
import { cn } from "@/lib/utils"

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

const fieldControl =
  "flex h-9 w-full min-w-0 cursor-pointer rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:text-base"

export function DashboardView() {
  const {
    period,
    years,
    setPeriod,
    metrics: data,
    isFetching,
    isPlaceholderData,
    error,
  } = useDashboard()
  const { year } = period
  const periodLabel = formatDashboardPeriod(period)
  // Cifras del periodo anterior mientras llegan las del nuevo.
  const stale = cn("transition-opacity", isPlaceholderData && "opacity-60")

  const money = (value: number | undefined) =>
    data && value !== undefined ? formatCurrency(value) : EMPTY_VALUE
  const count = (value: number | undefined) =>
    data && value !== undefined ? String(value) : EMPTY_VALUE

  const moneyMetrics: Metric[] = [
    {
      label: "Ventas totales",
      value: money(data?.ventasTotales),
      hint: `Tratamientos de ${periodLabel}`,
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
      hint: `Citas registradas en ${periodLabel}`,
      icon: Stethoscope,
    },
    {
      label: "Pacientes totales",
      value: count(data?.pacientesTotales),
      // El backend no acota este dato al periodo: es el histórico de activos.
      hint: "Expedientes activos (histórico)",
      icon: Users,
    },
    {
      label: "Pacientes nuevos",
      value: count(data?.pacientesNuevos),
      hint: `Registrados en ${periodLabel}`,
      icon: UserPlus,
    },
  ]

  const salesData = salesSeries(data?.ventasPorMes ?? [])
  const apptData = appointmentsSeries(data?.citasPorMes ?? [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
            {isFetching && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando...
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Métricas clave del consultorio en {periodLabel}.
          </p>
        </div>
        <PeriodFilters period={period} years={years} onChange={setPeriod} />
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error instanceof Error
            ? error.message
            : "No se pudieron cargar las métricas."}
        </p>
      )}

      {/* 1. Dinero */}
      <div className={cn("grid gap-4 sm:grid-cols-3", stale)}>
        {moneyMetrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {/* 2. Ventas por mes (siempre el año completo) */}
      <Card className={cn("border-border/70", MOBILE_CARD, stale)}>
        <CardHeader>
          <CardTitle className="text-base">Ventas por mes</CardTitle>
          <CardDescription>Ingresos por tratamientos en {year} (MXN)</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={salesConfig} className="h-72 w-full max-sm:h-56">
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
      <div className={cn("grid gap-4 sm:grid-cols-3", stale)}>
        {activityMetrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {/* 4. Citas por mes (siempre el año completo) */}
      <Card className={cn("border-border/70", MOBILE_CARD, stale)}>
        <CardHeader>
          <CardTitle className="text-base">Citas por mes</CardTitle>
          <CardDescription>Número de citas agendadas en {year}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={apptConfig} className="h-72 w-full max-sm:h-56">
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

/**
 * Segmentadores de mes y año. Filtran las tarjetas; las gráficas siempre
 * muestran los 12 meses del año elegido.
 */
function PeriodFilters({
  period,
  years,
  onChange,
}: {
  period: DashboardPeriod
  years: number[]
  onChange: (period: DashboardPeriod) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
      <FilterSelect
        id="dashboard-mes"
        label="Mes"
        className="sm:w-40"
        value={period.month === null ? DASHBOARD_WHOLE_YEAR : String(period.month)}
        onChange={(value) =>
          onChange({
            ...period,
            month: value === DASHBOARD_WHOLE_YEAR ? null : Number(value),
          })
        }
      >
        <option value={DASHBOARD_WHOLE_YEAR}>Todo el año</option>
        {MONTH_OPTIONS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id="dashboard-anio"
        label="Año"
        className="sm:w-28"
        value={String(period.year)}
        onChange={(value) => onChange({ ...period, year: Number(value) })}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </FilterSelect>
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  className,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        className={fieldControl}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  return (
    <Card className={cn("border-border/70", MOBILE_CARD)}>
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
