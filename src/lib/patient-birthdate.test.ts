import { describe, expect, test } from "bun:test"

import { calculateAge, formatAge, validateBirthDate } from "@/lib/clinic-data"
import { toPacientePayload, toPatient } from "@/lib/mappers"
import type { PacienteDTO } from "@/api/types"

const TODAY = "2026-09-15"

describe("calculateAge", () => {
  test("cuenta el cumpleaños del día de hoy", () => {
    expect(calculateAge("1990-09-15", TODAY)).toBe(36)
  })

  test("resta un año si aún no cumple", () => {
    expect(calculateAge("1990-09-16", TODAY)).toBe(35)
    expect(calculateAge("1990-12-01", TODAY)).toBe(35)
  })

  test("29 de febrero cumple el 1 de marzo en años no bisiestos", () => {
    expect(calculateAge("2000-02-29", "2027-02-28")).toBe(26)
    expect(calculateAge("2000-02-29", "2027-03-01")).toBe(27)
  })

  test("recién nacido tiene 0 años", () => {
    expect(calculateAge(TODAY, TODAY)).toBe(0)
  })
})

describe("formatAge", () => {
  test("null muestra Sin registrar", () => {
    expect(formatAge(null, TODAY)).toBe("Sin registrar")
  })

  test("singular y plural", () => {
    expect(formatAge("2025-09-15", TODAY)).toBe("1 año")
    expect(formatAge("1990-05-20", TODAY)).toBe("36 años")
  })
})

describe("validateBirthDate", () => {
  test("vacía solo es error si es obligatoria", () => {
    expect(validateBirthDate("", TODAY, true)).toBe(
      "Indica la fecha de nacimiento del paciente.",
    )
    expect(validateBirthDate("", TODAY)).toBeNull()
  })

  test("rechaza fechas futuras y permite hoy", () => {
    expect(validateBirthDate("2026-09-16", TODAY)).toBe(
      "La fecha de nacimiento no puede ser futura.",
    )
    expect(validateBirthDate(TODAY, TODAY)).toBeNull()
  })

  test("rechaza fechas inexistentes o mal formadas", () => {
    expect(validateBirthDate("2023-02-30", TODAY)).not.toBeNull()
    expect(validateBirthDate("20/05/1990", TODAY)).not.toBeNull()
  })
})

describe("toPacientePayload", () => {
  test("manda fecha_nacimiento y ya no manda edad", () => {
    const payload = toPacientePayload({ name: "Ana", birthDate: "1990-05-20" })
    expect(payload.fecha_nacimiento).toBe("1990-05-20")
    expect("edad" in payload).toBe(false)
  })

  test("null se envía para borrar la fecha", () => {
    const payload = toPacientePayload({ birthDate: null })
    expect(payload).toEqual({ fecha_nacimiento: null })
  })

  test("sin birthDate no se envía el campo (no cambia)", () => {
    const payload = toPacientePayload({ name: "Ana" })
    expect("fecha_nacimiento" in payload).toBe(false)
  })
})

describe("toPatient", () => {
  const base: PacienteDTO = {
    id: 1,
    cp: null,
    direccion: null,
    fecha_nacimiento: null,
    correo: null,
    telefono: null,
    notas: null,
    nombre: "Ana",
    sexo: "Femenino",
    isActive: true,
    correo_medico: null,
  }

  test("pacientes anteriores quedan con birthDate null", () => {
    expect(toPatient(base).birthDate).toBeNull()
  })

  test("conserva el día sin desfase de zona horaria", () => {
    expect(toPatient({ ...base, fecha_nacimiento: "1990-05-20" }).birthDate).toBe(
      "1990-05-20",
    )
    // Por si el backend llegara a serializarla como timestamp a medianoche UTC.
    expect(
      toPatient({ ...base, fecha_nacimiento: "1990-05-20T00:00:00.000Z" })
        .birthDate,
    ).toBe("1990-05-20")
  })
})
