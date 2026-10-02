import { describe, expect, test } from "bun:test"

import { photoSelectionError } from "@/lib/patient-photos"

const MB = 1024 * 1024

const files = (...sizes: number[]) =>
  sizes.map((size, index) => ({ name: `foto-${index + 1}.jpg`, size }))

describe("photoSelectionError", () => {
  test("permite subir mientras el total no pase de 5", () => {
    expect(photoSelectionError(0, files(MB))).toBeNull()
    expect(photoSelectionError(2, files(MB, MB, MB))).toBeNull()
  })

  test("dice cuántas se pueden subir todavía, igual que el backend", () => {
    expect(photoSelectionError(4, files(MB, MB))).toBe(
      "El paciente ya tiene 4 imágenes: solo puedes subir 1 más (máximo 5).",
    )
    expect(photoSelectionError(1, files(MB, MB, MB, MB, MB))).toBe(
      "El paciente ya tiene 1 imagen: solo puedes subir 4 más (máximo 5).",
    )
  })

  test("con 5 fotos pide eliminar alguna", () => {
    expect(photoSelectionError(5, files(MB))).toBe(
      "El paciente ya tiene 5 imágenes, el máximo permitido. Elimina alguna para subir otra.",
    )
  })

  test("sin fotos, no deja elegir más de 5 a la vez", () => {
    expect(photoSelectionError(0, files(MB, MB, MB, MB, MB, MB))).toBe(
      "Puedes subir como máximo 5 imágenes.",
    )
  })

  test("rechaza un archivo de más de 20 MB y acepta uno de 20 MB exactos", () => {
    expect(photoSelectionError(0, files(MB, 20 * MB + 1))).toBe(
      '"foto-2.jpg" pesa más de 20 MB.',
    )
    expect(photoSelectionError(0, files(20 * MB))).toBeNull()
  })
})
