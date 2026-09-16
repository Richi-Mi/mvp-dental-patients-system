import { describe, expect, test } from "bun:test"

import { clinicalQuestionsFor } from "@/lib/clinic-data"
import { toHistorialPayload, toPatient } from "@/lib/mappers"
import type { HistorialClinicoDTO, PacienteDTO } from "@/api/types"

const PACIENTE: PacienteDTO = {
  id: 1,
  cp: null,
  direccion: null,
  fecha_nacimiento: null,
  correo: null,
  telefono: null,
  notas: null,
  nombre: "Ana López",
  sexo: "Femenino",
  isActive: true,
  correo_medico: "medico@gmail.com",
}

const HISTORIAL: HistorialClinicoDTO = {
  id_paciente: 1,
  historial: {
    pregunta_1: "No",
    pregunta_2: null,
    pregunta_3: "Penicilina",
    pregunta_4: null,
    pregunta_5: null,
    pregunta_6: null,
    pregunta_7: null,
    pregunta_8: null,
    pregunta_9: null,
    pregunta_10: "No",
  },
}

describe("clinicalQuestionsFor", () => {
  test("muestra la pregunta de embarazo a pacientes de sexo femenino", () => {
    const keys = clinicalQuestionsFor("Femenino").map((q) => q.key)
    expect(keys).toHaveLength(10)
    expect(keys).toContain("pregunta_10")
  })

  test("compara el sexo sin distinguir mayúsculas ni espacios", () => {
    expect(clinicalQuestionsFor(" femenino ")).toHaveLength(10)
  })

  test("oculta la pregunta de embarazo si el sexo no es femenino", () => {
    for (const gender of ["Masculino", ""]) {
      const keys = clinicalQuestionsFor(gender).map((q) => q.key)
      expect(keys).toHaveLength(9)
      expect(keys).not.toContain("pregunta_10")
    }
  })
})

describe("historial clínico en mappers", () => {
  test("toPatient convierte las respuestas null en cadenas vacías", () => {
    const patient = toPatient({ ...PACIENTE, historialClinico: HISTORIAL })

    expect(patient.clinicalHistory).toMatchObject({
      pregunta_1: "No",
      pregunta_2: "",
      pregunta_3: "Penicilina",
      pregunta_10: "No",
    })
  })

  test("toPatient deja clinicalHistory en null si no hay historial", () => {
    expect(toPatient({ ...PACIENTE, historialClinico: null }).clinicalHistory).toBeNull()
    expect(toPatient(PACIENTE).clinicalHistory).toBeNull()
  })

  test("toHistorialPayload manda en null las respuestas en blanco", () => {
    expect(
      toHistorialPayload(1, { pregunta_1: " No ", pregunta_2: "", pregunta_3: "  " }),
    ).toEqual({
      id_paciente: 1,
      historial: { pregunta_1: "No", pregunta_2: null, pregunta_3: null },
    })
  })

  test("toHistorialPayload omite las preguntas no enviadas para no borrarlas al actualizar", () => {
    const { historial } = toHistorialPayload(1, { pregunta_1: "No" })

    expect(historial).toEqual({ pregunta_1: "No" })
    expect(historial).not.toHaveProperty("pregunta_10")
  })
})
