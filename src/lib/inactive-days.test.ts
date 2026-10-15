import { describe, expect, test } from "bun:test"

import { inactiveDayMessage, withInactiveDay } from "@/lib/clinic-data"

describe("withInactiveDay", () => {
  test("agrega el día manteniendo la lista ordenada", () => {
    expect(withInactiveDay(["2026-10-12", "2026-10-20"], "2026-10-15", true)).toEqual([
      "2026-10-12",
      "2026-10-15",
      "2026-10-20",
    ])
  })

  test("no repite un día que ya estaba marcado", () => {
    expect(withInactiveDay(["2026-10-15"], "2026-10-15", true)).toEqual(["2026-10-15"])
  })

  test("quita el día al volver a activarlo", () => {
    expect(withInactiveDay(["2026-10-12", "2026-10-15"], "2026-10-15", false)).toEqual([
      "2026-10-12",
    ])
  })

  test("activar un día que no estaba inactivo no cambia nada", () => {
    expect(withInactiveDay(["2026-10-12"], "2026-10-15", false)).toEqual(["2026-10-12"])
  })

  test("no modifica la lista recibida (es la de la caché)", () => {
    const dates = ["2026-10-20"]
    withInactiveDay(dates, "2026-10-15", true)
    expect(dates).toEqual(["2026-10-20"])
  })
})

describe("inactiveDayMessage", () => {
  test("nombra la fecha completa", () => {
    expect(inactiveDayMessage("2026-10-15")).toBe(
      "El 15 de octubre de 2026 está marcado como día inactivo. Elige otro día.",
    )
  })
})
