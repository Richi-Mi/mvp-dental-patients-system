import { describe, expect, mock, test } from "bun:test"

import {
  applyFontSize,
  FONT_SIZE,
  fontSizeFor,
  normalizeFontSize,
} from "@/lib/font-size"

describe("normalizeFontSize", () => {
  test("respeta los valores válidos", () => {
    expect(normalizeFontSize(90)).toBe(90)
    expect(normalizeFontSize(115)).toBe(115)
    expect(normalizeFontSize(130)).toBe(130)
  })

  test("lleva al rango los valores que se salen", () => {
    expect(normalizeFontSize(50)).toBe(FONT_SIZE.min)
    expect(normalizeFontSize(400)).toBe(FONT_SIZE.max)
  })

  test("redondea al paso del slider", () => {
    expect(normalizeFontSize(112)).toBe(110)
    expect(normalizeFontSize(113)).toBe(115)
  })

  test("lo que no es un número vale el tamaño normal", () => {
    for (const value of [undefined, null, "120", Number.NaN, Infinity, {}]) {
      expect(normalizeFontSize(value)).toBe(FONT_SIZE.default)
    }
  })
})

describe("fontSizeFor", () => {
  const sizes = { "medico@gmail.com": 120 }

  test("sin sesión (pantalla de login) es el tamaño normal", () => {
    expect(fontSizeFor(sizes, null)).toBe(100)
    expect(fontSizeFor(sizes, undefined)).toBe(100)
  })

  test("cada usuario tiene el suyo; sin preferencia, el normal", () => {
    expect(fontSizeFor(sizes, "medico@gmail.com")).toBe(120)
    expect(fontSizeFor(sizes, "asistente@gmail.com")).toBe(100)
  })

  test("tolera lo guardado corrupto", () => {
    expect(fontSizeFor(null, "medico@gmail.com")).toBe(100)
    expect(fontSizeFor({ "medico@gmail.com": "grande" }, "medico@gmail.com")).toBe(100)
  })
})

describe("applyFontSize", () => {
  const buildRoot = () => ({
    style: { setProperty: mock(), removeProperty: mock() },
  })

  test("pone la variable CSS en porcentaje", () => {
    const root = buildRoot()
    applyFontSize(115, root)
    expect(root.style.setProperty).toHaveBeenCalledWith("--app-font-size", "115%")
  })

  test("con el tamaño normal quita la variable", () => {
    const root = buildRoot()
    applyFontSize(100, root)
    expect(root.style.removeProperty).toHaveBeenCalledWith("--app-font-size")
    expect(root.style.setProperty).not.toHaveBeenCalled()
  })
})
