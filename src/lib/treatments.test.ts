import { describe, expect, test } from "bun:test"

import { toTreatment, toTreatmentPayload } from "@/lib/mappers"
import type { TratamientoDTO } from "@/api/types"

const TRATAMIENTO: TratamientoDTO = {
  id: "1-2026-09-10-a1b2c3d4",
  fecha: "2026-09-10",
  nombre: "Limpieza",
  costo: "500.00",
  cuenta: null,
  id_paciente: 1,
}

describe("tratamientos sin nombre", () => {
  test("toTreatment muestra vacío el SIN_MOTIVO que guarda el backend", () => {
    const treatment = toTreatment({ ...TRATAMIENTO, nombre: "SIN_MOTIVO" })

    expect(treatment.tratamiento).toBe("")
    expect(treatment.costo).toBe(500)
  })

  test("toTreatment conserva los nombres capturados", () => {
    expect(toTreatment(TRATAMIENTO).tratamiento).toBe("Limpieza")
  })

  test("toTreatmentPayload manda vacío el nombre para que el backend ponga SIN_MOTIVO", () => {
    expect(
      toTreatmentPayload({ fecha: "2026-09-10", tratamiento: "", costo: 0, aCuenta: 200 }),
    ).toEqual({ fecha: "2026-09-10", nombre: "", costo: 0, cuenta: 200 })
  })
})
