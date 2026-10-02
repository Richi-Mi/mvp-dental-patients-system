import { describe, expect, test } from "bun:test"

import { LAST_END_HOUR } from "@/lib/clinic-data"
import {
  OPENING_HOURS,
  clampSegment,
  splitTime,
  typeDigit,
  type HourRange,
} from "@/lib/time-segment"

/** Teclea una secuencia de dígitos y devuelve el último resultado. */
function type(
  segment: "hours" | "minutes",
  digits: string,
  hours: HourRange = OPENING_HOURS,
) {
  let pending: string | null = null
  let result = typeDigit(segment, pending, digits[0], hours)
  pending = result.pending
  for (const digit of digits.slice(1)) {
    result = typeDigit(segment, pending, digit, hours)
    pending = result.pending
  }
  return result
}

/** El rango del selector de hora de fin: una hora más allá del cierre. */
const END_HOURS: HourRange = { min: OPENING_HOURS.min, max: LAST_END_HOUR }

describe("rango de horas", () => {
  test("por defecto no pasa de la última hora de atención", () => {
    expect(splitTime("21:30").hours).toBe("20")
    expect(type("hours", "21").value).toBe("20")
  })

  test("el selector de hora de fin acepta la hora siguiente al cierre", () => {
    expect(splitTime("21:30", END_HOURS)).toEqual({ hours: "21", minutes: "30" })
    expect(type("hours", "21", END_HOURS).value).toBe("21")
    expect(type("hours", "23", END_HOURS).value).toBe("21")
  })

  test("las flechas dan la vuelta dentro del rango indicado", () => {
    expect(clampSegment("22", "hours", true, END_HOURS)).toBe("10")
    expect(clampSegment("9", "hours", true, END_HOURS)).toBe("21")
  })
})

describe("typeDigit (horas, 10–20)", () => {
  test("teclear 1 y 5 da 15", () => {
    expect(type("hours", "15")).toEqual({
      value: "15",
      pending: null,
      advance: true,
    })
  })

  test("teclear 2 y 0 da 20", () => {
    expect(type("hours", "20").value).toBe("20")
  })

  test("el primer dígito espera al segundo", () => {
    expect(typeDigit("hours", null, "1")).toEqual({
      value: "10",
      pending: "1",
      advance: false,
    })
  })

  test("un par fuera de rango se ajusta al límite", () => {
    expect(type("hours", "25").value).toBe("20")
    expect(type("hours", "09").value).toBe("10")
  })

  test("un dígito que no puede iniciar un par cierra solo", () => {
    expect(typeDigit("hours", null, "5")).toEqual({
      value: "10",
      pending: null,
      advance: true,
    })
  })
})

describe("typeDigit (minutos)", () => {
  test("teclear 3 y 0 da 30", () => {
    expect(type("minutes", "30").value).toBe("30")
  })

  test("un primer dígito mayor a 5 cierra el par: 7 -> 07", () => {
    expect(typeDigit("minutes", null, "7")).toEqual({
      value: "07",
      pending: null,
      advance: true,
    })
  })

  test("5 y 9 da 59", () => {
    expect(type("minutes", "59").value).toBe("59")
  })
})
