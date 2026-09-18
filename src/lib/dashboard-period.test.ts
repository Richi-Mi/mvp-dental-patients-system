import { describe, expect, test } from "bun:test"

import {
  dashboardYears,
  formatDashboardPeriod,
  readDashboardPeriod,
} from "@/lib/clinic-data"
import { toDashboard } from "@/lib/mappers"
import type { DashboardDTO } from "@/api/types"

const TODAY = new Date(2026, 8, 16) // 16 de septiembre de 2026

const params = (query: string) => new URLSearchParams(query)

describe("dashboardYears", () => {
  test("solo ofrece 2026 mientras sea el año en curso", () => {
    expect(dashboardYears(TODAY)).toEqual([2026])
  })

  test("agrega los años nuevos conforme pasan, del más reciente al más antiguo", () => {
    expect(dashboardYears(new Date(2028, 0, 1))).toEqual([2028, 2027, 2026])
  })
})

describe("readDashboardPeriod", () => {
  test("sin parámetros usa el mes en curso del año actual", () => {
    expect(readDashboardPeriod(params(""), TODAY)).toEqual({ year: 2026, month: 9 })
  })

  test("lee año y mes de la URL", () => {
    const today = new Date(2027, 2, 10)
    expect(readDashboardPeriod(params("year=2026&month=12"), today)).toEqual({
      year: 2026,
      month: 12,
    })
  })

  test("month=todo es todo el año", () => {
    expect(readDashboardPeriod(params("year=2026&month=todo"), TODAY)).toEqual({
      year: 2026,
      month: null,
    })
  })

  test("ignora un año fuera del selector", () => {
    expect(readDashboardPeriod(params("year=2025&month=3"), TODAY)).toEqual({
      year: 2026,
      month: 3,
    })
    expect(readDashboardPeriod(params("year=2027"), TODAY).year).toBe(2026)
    expect(readDashboardPeriod(params("year=abc"), TODAY).year).toBe(2026)
  })

  test("ignora un mes inválido", () => {
    for (const month of ["0", "13", "2.5", "abc", ""]) {
      expect(readDashboardPeriod(params(`month=${month}`), TODAY).month).toBe(9)
    }
  })
})

describe("formatDashboardPeriod", () => {
  test("mes a mitad de frase, en minúsculas", () => {
    expect(formatDashboardPeriod({ year: 2026, month: 9 })).toBe("septiembre de 2026")
  })

  test("solo el año cuando es todo el año", () => {
    expect(formatDashboardPeriod({ year: 2026, month: null })).toBe("2026")
  })
})

describe("toDashboard", () => {
  const base: DashboardDTO = {
    year: 2026,
    month: 9,
    ventasTotales: 3200.5,
    consultasTotales: 5,
    dineroPorCobrar: 1700.25,
    pacientesNuevos: 4,
    pacientesTotales: 10,
    ventasPorMes: [0, 0, 0, 0, 0, 0, 0, 1000, 3200.5, 0, 0, 0],
    citasPorMes: [0, 0, 0, 0, 0, 0, 0, 3, 5, 0, 0, 0],
  }

  test("mapea el mes y los pacientes nuevos", () => {
    const metrics = toDashboard(base)
    expect(metrics.month).toBe(9)
    expect(metrics.pacientesNuevos).toBe(4)
    expect(metrics.dineroACuenta).toBe(1500.25)
  })

  test("month null = todo el año", () => {
    expect(toDashboard({ ...base, month: null }).month).toBeNull()
  })
})
