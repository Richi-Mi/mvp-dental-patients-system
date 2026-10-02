import { describe, expect, test } from "bun:test"

import { csvField, patientsToCsv } from "@/lib/patients-csv"
import type { Patient } from "@/types/clinic"

const TODAY = "2026-09-15"

const PACIENTE: Patient = {
  id: 1,
  name: "Ana López",
  birthDate: "1990-05-20",
  gender: "Femenino",
  phone: "5512345678",
  email: "ana@gmail.com",
  address: "Calle 1",
  cp: "01000",
  notes: "",
  medicoEmail: "medico@gmail.com",
  createdAt: "2026-09-16",
  treatments: [],
  upcoming: [],
  clinicalHistory: null,
}

const ENCABEZADO =
  "Nombre,Fecha de nacimiento,Edad,Sexo,Teléfono,Correo,Dirección,CP,Notas,Fecha de registro"

/** Renglones del CSV sin el BOM; el último es "" porque el archivo termina en CRLF. */
function lines(csv: string): string[] {
  return csv.slice(1).split("\r\n")
}

describe("csvField", () => {
  test("deja igual el texto sin caracteres especiales", () => {
    expect(csvField("Ana López")).toBe("Ana López")
    expect(csvField("")).toBe("")
  })

  test("entrecomilla comas, comillas y saltos de línea", () => {
    expect(csvField("López, Ana")).toBe('"López, Ana"')
    expect(csvField('Dijo "mañana"')).toBe('"Dijo ""mañana"""')
    expect(csvField("Línea 1\nLínea 2")).toBe('"Línea 1\nLínea 2"')
    expect(csvField("Línea 1\r\nLínea 2")).toBe('"Línea 1\r\nLínea 2"')
  })

  test("antepone un apóstrofo a lo que Excel tomaría como fórmula", () => {
    expect(csvField("=HIPERVINCULO(\"x\")")).toBe('"\'=HIPERVINCULO(""x"")"')
    expect(csvField("+52 55 1234 5678")).toBe("'+52 55 1234 5678")
    expect(csvField("-1")).toBe("'-1")
    expect(csvField("@usuario")).toBe("'@usuario")
  })
})

describe("patientsToCsv", () => {
  test("empieza con BOM y el encabezado, y separa los renglones con CRLF", () => {
    const csv = patientsToCsv([PACIENTE], TODAY)

    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(lines(csv)).toEqual([
      ENCABEZADO,
      "Ana López,1990-05-20,36,Femenino,5512345678,ana@gmail.com,Calle 1,01000,,2026-09-16",
      "",
    ])
  })

  test("calcula la edad con la fecha indicada", () => {
    const [, row] = lines(patientsToCsv([{ ...PACIENTE, birthDate: "1990-09-16" }], TODAY))

    expect(row?.split(",")[2]).toBe("35")
  })

  test("deja vacías la fecha de nacimiento y la edad si no se capturó", () => {
    const [, row] = lines(patientsToCsv([{ ...PACIENTE, birthDate: null }], TODAY))

    expect(row).toBe(
      "Ana López,,,Femenino,5512345678,ana@gmail.com,Calle 1,01000,,2026-09-16",
    )
  })

  test("una nota con comas y saltos de línea queda en una sola celda", () => {
    const csv = patientsToCsv(
      [{ ...PACIENTE, notes: "Alergia a la penicilina,\nusa brackets" }],
      TODAY,
    )

    expect(csv).toContain(',"Alergia a la penicilina,\nusa brackets",2026-09-16\r\n')
  })

  test("sin pacientes solo trae el encabezado", () => {
    expect(lines(patientsToCsv([], TODAY))).toEqual([ENCABEZADO, ""])
  })
})
