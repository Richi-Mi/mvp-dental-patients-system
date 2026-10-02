import { describe, expect, test } from "bun:test"

import type { CitaDTO } from "@/api/types"
import {
  LAST_END_HOUR,
  defaultEndTime,
  formatTimeRange,
  minutesToTime,
  shiftEndTime,
  timeToMinutes,
} from "@/lib/clinic-data"
import { normalizeStatus, toAppointment } from "@/lib/mappers"

describe("timeToMinutes / minutesToTime", () => {
  test("convierten entre HH:mm y minutos desde la medianoche", () => {
    expect(timeToMinutes("10:30")).toBe(630)
    expect(timeToMinutes("11:00:00")).toBe(660)
    expect(minutesToTime(630)).toBe("10:30")
    expect(minutesToTime(65)).toBe("01:05")
  })

  test("una hora ilegible es null y el resultado no se sale del día", () => {
    expect(timeToMinutes("")).toBeNull()
    expect(timeToMinutes("25:00")).toBeNull()
    expect(minutesToTime(24 * 60 + 30)).toBe("23:59")
    expect(minutesToTime(-10)).toBe("00:00")
  })
})

describe("defaultEndTime / shiftEndTime", () => {
  test("una cita nueva dura una hora", () => {
    expect(defaultEndTime("10:00")).toBe("11:00")
    expect(defaultEndTime("20:45")).toBe("21:45")
  })

  test("mover el inicio conserva la duración", () => {
    expect(shiftEndTime("10:00", "11:30", "12:00")).toBe("13:30")
    expect(shiftEndTime("10:00", "11:00", "10:15")).toBe("11:15")
  })

  test("si la duración anterior no era válida, vuelve a la de por defecto", () => {
    expect(shiftEndTime("10:00", "09:00", "12:00")).toBe("13:00")
  })

  test("no pasa de la última hora de fin", () => {
    expect(shiftEndTime("10:00", "13:00", "20:30")).toBe(`${LAST_END_HOUR}:59`)
  })

  test("formatTimeRange arma el rango de la tarjeta", () => {
    expect(formatTimeRange("10:00", "11:00")).toBe("10:00 - 11:00")
  })
})

describe("toAppointment", () => {
  const dto = (horaFin?: string): CitaDTO =>
    ({
      id: "c1",
      // 10:00 en la hora local de quien corre la prueba.
      fecha_cita: new Date(2026, 8, 21, 10, 0).toISOString(),
      horaFin,
      motivo: "Limpieza",
      estatus: "confirmada",
      correo_medico: "medico@gmail.com",
      id_paciente: 1,
    }) as CitaDTO

  test("toma la hora de fin del backend", () => {
    expect(toAppointment(dto("11:30"))).toMatchObject({ time: "10:00", endTime: "11:30" })
    expect(toAppointment(dto("11:30:00")).endTime).toBe("11:30")
  })

  test("sin hora de fin, la cita dura una hora", () => {
    expect(toAppointment(dto()).endTime).toBe("11:00")
  })

  test("una cita guardada con el antiguo estatus «pendiente» se muestra como no asistió", () => {
    expect(toAppointment({ ...dto("11:00"), estatus: "pendiente" }).status).toBe("no_asistio")
  })
})

describe("normalizeStatus", () => {
  test("reconoce los estatus del cliente sin importar mayúsculas ni espacios", () => {
    expect(normalizeStatus(" Confirmada ")).toBe("confirmada")
    expect(normalizeStatus("no_asistio")).toBe("no_asistio")
  })

  test("un estatus que el cliente no maneja cae en no asistió", () => {
    expect(normalizeStatus("pendiente")).toBe("no_asistio")
    expect(normalizeStatus("otro")).toBe("no_asistio")
  })
})
