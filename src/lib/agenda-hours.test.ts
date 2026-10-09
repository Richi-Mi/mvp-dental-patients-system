import { describe, expect, test } from "bun:test"

import {
  DEFAULT_WORKING_HOURS,
  agendaHours,
  defaultEndTime,
  formatWorkingHours,
  groupByHour,
  hourLabel,
  hourOf,
  layoutDay,
  normalizeWorkingHours,
} from "@/lib/clinic-data"
import type { Appointment } from "@/types/clinic"

// Casi todo se prueba con el horario por defecto, de 10 a 20 h.
const HOURS = DEFAULT_WORKING_HOURS
const OPENING_HOUR = HOURS.opening
const CLOSING_HOUR = HOURS.closing
const AGENDA_HOURS = agendaHours(HOURS)
const group = (appointments: Appointment[]) => groupByHour(appointments, HOURS)
const dayLayout = (appointments: Appointment[]) => layoutDay(appointments, HOURS)

const cita = (time: string, endTime = defaultEndTime(time)): Appointment => ({
  id: time,
  patientId: 1,
  patientName: "Ana",
  date: "2026-09-21",
  time,
  endTime,
  status: "confirmada",
  motivo: "Limpieza",
})

/** Fila del horario de una hora (0 = la de apertura). */
const row = (hour: number) => hour - OPENING_HOUR

/** Las citas de la hora indicada, por su `time`. */
const at = (slots: ReturnType<typeof groupByHour>["slots"], hour: number) =>
  slots.find((slot) => slot.hour === hour)?.items.map((c) => c.time)

describe("agendaHours", () => {
  test("cubre el horario completo, una hora por fila", () => {
    expect(AGENDA_HOURS[0]).toBe(OPENING_HOUR)
    expect(AGENDA_HOURS.at(-1)).toBe(CLOSING_HOUR)
    expect(AGENDA_HOURS.length).toBe(CLOSING_HOUR - OPENING_HOUR + 1)
  })

  test("sigue el horario de cada usuario", () => {
    expect(agendaHours({ opening: 8, closing: 12 })).toEqual([8, 9, 10, 11, 12])
    expect(agendaHours({ opening: 15, closing: 15 })).toEqual([15])
  })

  test("formatWorkingHours lo lee como rango", () => {
    expect(formatWorkingHours(HOURS)).toBe("10:00 a 20:00 h")
    expect(formatWorkingHours({ opening: 7, closing: 13 })).toBe("07:00 a 13:00 h")
  })
})

describe("normalizeWorkingHours", () => {
  test("respeta un horario válido", () => {
    expect(normalizeWorkingHours(8, 18)).toEqual({ opening: 8, closing: 18 })
    expect(normalizeWorkingHours(0, 23)).toEqual({ opening: 0, closing: 23 })
    expect(normalizeWorkingHours(12, 12)).toEqual({ opening: 12, closing: 12 })
  })

  test("lo que no es un horario válido vale el de por defecto", () => {
    for (const [opening, closing] of [
      [18, 8],
      [-1, 10],
      [10, 24],
      [9.5, 18],
      ["8", 18],
      [undefined, undefined],
      [null, 20],
    ]) {
      expect(normalizeWorkingHours(opening, closing)).toEqual(DEFAULT_WORKING_HOURS)
    }
  })
})

describe("hourLabel / hourOf", () => {
  test("arma y lee la hora en dos dígitos", () => {
    expect(hourLabel(10)).toBe("10:00")
    expect(hourOf("10:45")).toBe(10)
  })

  test("devuelve null si la hora no se puede leer", () => {
    expect(hourOf("")).toBeNull()
    expect(hourOf("ab:cd")).toBeNull()
    expect(hourOf("99:00")).toBeNull()
  })
})

describe("groupByHour", () => {
  test("deja una fila por hora aunque no haya citas", () => {
    const { slots, outOfHours } = group([])
    expect(slots.map((slot) => slot.hour)).toEqual([...AGENDA_HOURS])
    expect(slots.every((slot) => slot.items.length === 0)).toBe(true)
    expect(outOfHours).toEqual([])
  })

  test("apila las citas simultáneas en su bloque, ordenadas por minuto", () => {
    const { slots } = group([cita("10:45"), cita("11:00"), cita("10:15")])
    expect(at(slots, 10)).toEqual(["10:15", "10:45"])
    expect(at(slots, 11)).toEqual(["11:00"])
  })

  test("la última hora es un bloque completo", () => {
    const { slots, outOfHours } = group([cita("20:45")])
    expect(at(slots, CLOSING_HOUR)).toEqual(["20:45"])
    expect(outOfHours).toEqual([])
  })

  test("las citas fuera del horario se devuelven aparte, no en una fila ajena", () => {
    const { slots, outOfHours } = group([
      cita("21:30"),
      cita("09:00"),
      cita("sin hora"),
    ])
    expect(slots.every((slot) => slot.items.length === 0)).toBe(true)
    expect(outOfHours.map((c) => c.time)).toEqual(["09:00", "21:30", "sin hora"])
  })
})

describe("layoutDay", () => {
  /** El bloque que empieza a esa hora, sin las citas (para comparar su acomodo). */
  const blockAt = (layout: ReturnType<typeof layoutDay>, hour: number) => {
    const block = layout.blocks.find((b) => b.hour === hour)
    if (!block) return undefined
    const { row, rowSpan, lane, laneSpan } = block
    return { row, rowSpan, lane, laneSpan }
  }

  test("un día sin citas tiene todas las horas libres y un solo carril", () => {
    const layout = dayLayout([])
    expect(layout.blocks).toEqual([])
    expect(layout.lanes).toBe(1)
    expect(layout.busy).toEqual(AGENDA_HOURS.map(() => false))
  })

  test("una cita abarca las filas de las horas que dura", () => {
    const layout = dayLayout([cita("10:00", "12:00")])
    expect(blockAt(layout, 10)).toEqual({ row: 0, rowSpan: 2, lane: 0, laneSpan: 1 })
    expect(layout.busy.slice(0, 3)).toEqual([true, true, false])
  })

  test("redondea a horas completas: ocupa todas las horas que toca", () => {
    expect(blockAt(dayLayout([cita("10:30", "11:15")]), 10)?.rowSpan).toBe(2)
    expect(blockAt(dayLayout([cita("10:00", "10:30")]), 10)?.rowSpan).toBe(1)
    expect(blockAt(dayLayout([cita("10:00", "11:00")]), 10)?.rowSpan).toBe(1)
  })

  test("las citas de la misma hora van en un bloque que llega hasta la que termina más tarde", () => {
    const layout = dayLayout([cita("10:30", "12:00"), cita("10:00", "10:30")])
    expect(layout.blocks).toHaveLength(1)
    expect(layout.blocks[0].items.map((c) => c.time)).toEqual(["10:00", "10:30"])
    expect(blockAt(layout, 10)?.rowSpan).toBe(2)
  })

  test("una cita que empieza mientras otra sigue va en otro carril; las demás usan todo el ancho", () => {
    const layout = dayLayout([
      cita("10:00", "12:00"),
      cita("11:00", "12:00"),
      cita("14:00", "15:00"),
    ])
    expect(layout.lanes).toBe(2)
    expect(blockAt(layout, 10)).toEqual({ row: row(10), rowSpan: 2, lane: 0, laneSpan: 1 })
    expect(blockAt(layout, 11)).toEqual({ row: row(11), rowSpan: 1, lane: 1, laneSpan: 1 })
    expect(blockAt(layout, 14)).toEqual({ row: row(14), rowSpan: 1, lane: 0, laneSpan: 2 })
  })

  test("las citas que comparten una hora sin encimarse van en el mismo carril", () => {
    const layout = dayLayout([
      cita("10:00", "10:10"),
      cita("10:10", "10:30"),
      cita("10:30", "11:30"),
      cita("11:30", "12:00"),
    ])
    expect(layout.lanes).toBe(1)
    expect(layout.blocks).toHaveLength(1)
    expect(layout.blocks[0].items.map((c) => c.time)).toEqual([
      "10:00",
      "10:10",
      "10:30",
      "11:30",
    ])
    expect(blockAt(layout, 10)).toEqual({ row: row(10), rowSpan: 2, lane: 0, laneSpan: 1 })
    // Las horas del día (vista de teléfono) no cambian al unirse los bloques.
    expect(at(layout.slots, 10)).toEqual(["10:00", "10:10", "10:30"])
    expect(at(layout.slots, 11)).toEqual(["11:30"])
  })

  test("un bloque que se une a otro alarga sus filas hasta donde termina", () => {
    const layout = dayLayout([cita("10:00", "11:30"), cita("11:30", "13:00")])
    expect(layout.lanes).toBe(1)
    expect(blockAt(layout, 10)).toEqual({ row: row(10), rowSpan: 3, lane: 0, laneSpan: 1 })
    expect(layout.busy.slice(0, 4)).toEqual([true, true, true, false])
  })

  test("un carril se reutiliza cuando termina la cita que lo ocupaba", () => {
    const layout = dayLayout([
      cita("10:00", "12:00"),
      cita("11:00", "13:00"),
      cita("12:00", "13:00"),
    ])
    expect(layout.lanes).toBe(2)
    expect(blockAt(layout, 12)).toEqual({ row: row(12), rowSpan: 1, lane: 0, laneSpan: 1 })
  })

  test("una cita que termina después del cierre no pasa de la última fila", () => {
    const layout = dayLayout([cita("20:30", "21:45")])
    expect(blockAt(layout, CLOSING_HOUR)).toEqual({
      row: row(CLOSING_HOUR),
      rowSpan: 1,
      lane: 0,
      laneSpan: 1,
    })
  })

  test("una hora de fin que no es posterior al inicio ocupa solo su fila", () => {
    expect(blockAt(dayLayout([cita("12:00", "11:00")]), 12)?.rowSpan).toBe(1)
    expect(blockAt(dayLayout([cita("12:00", "")]), 12)?.rowSpan).toBe(1)
  })

  test("sigue el horario del usuario: sus filas y lo que queda fuera", () => {
    const morning = { opening: 8, closing: 12 }
    const layout = layoutDay(
      [cita("08:00", "09:30"), cita("12:30", "14:00"), cita("13:00")],
      morning,
    )
    expect(layout.slots.map((slot) => slot.hour)).toEqual([8, 9, 10, 11, 12])
    expect(blockAt(layout, 8)).toEqual({ row: 0, rowSpan: 2, lane: 0, laneSpan: 1 })
    // Termina después del cierre: no pasa de la última fila.
    expect(blockAt(layout, 12)).toEqual({ row: 4, rowSpan: 1, lane: 0, laneSpan: 1 })
    expect(layout.busy).toEqual([true, true, false, false, true])
    expect(layout.outOfHours.map((c) => c.time)).toEqual(["13:00"])
  })

  test("las citas fuera del horario no ocupan filas", () => {
    const layout = dayLayout([cita("21:30"), cita("09:00", "10:30")])
    expect(layout.blocks).toEqual([])
    expect(layout.busy.every((busy) => !busy)).toBe(true)
    expect(layout.outOfHours.map((c) => c.time)).toEqual(["09:00", "21:30"])
  })
})
