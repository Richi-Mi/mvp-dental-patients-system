import { describe, expect, test } from "bun:test"

import {
  addOperation,
  agendaScope,
  applyToAppointments,
  applyToPatient,
  applyToPatients,
  citaIdFor,
  dependsOnPendingCita,
  dependsOnTempPatient,
  describeOperation,
  findConflict,
  isTempId,
  mergeClinicalHistory,
  newTempPatientId,
  replacePatientId,
  resolvePatientIds,
  type NewOperation,
  type PendingOperation,
} from "@/lib/offline-queue"
import type { Appointment, ClinicalHistory, Patient } from "@/types/clinic"

const OWNER = "medico@gmail.com"

let seq = 0
/** Cambio de prueba con los campos comunes ya rellenos. */
function pending(op: NewOperation, overrides: Partial<PendingOperation> = {}): PendingOperation {
  seq += 1
  return {
    ...op,
    id: `op-${seq}`,
    owner: OWNER,
    createdAt: "2026-09-20T12:00:00.000Z",
    ...overrides,
  }
}

const PATIENT: Patient = {
  id: 1,
  name: "Ana López",
  birthDate: "1990-01-01",
  gender: "Femenino",
  phone: "555-0000",
  email: "ana@example.com",
  address: "",
  cp: "",
  notes: "",
  medicoEmail: OWNER,
  createdAt: "2026-09-01",
  treatments: [],
  upcoming: [],
  clinicalHistory: null,
}

describe("ids temporales", () => {
  test("newTempPatientId siempre es negativo y distinto entre llamadas", () => {
    const a = newTempPatientId()
    const b = newTempPatientId()
    expect(isTempId(a)).toBe(true)
    expect(isTempId(b)).toBe(true)
    expect(a).not.toBe(b)
  })

  test("isTempId solo es true para negativos", () => {
    expect(isTempId(-1)).toBe(true)
    expect(isTempId(0)).toBe(false)
    expect(isTempId(42)).toBe(false)
  })

  test("citaIdFor sigue el formato del backend", () => {
    expect(citaIdFor("medico@gmail.com", "2026-09-21", "10:00")).toBe(
      `medico@gmail.com_${new Date(2026, 8, 21, 10, 0).toISOString()}`,
    )
  })
})

describe("dependsOnTempPatient / resolvePatientIds", () => {
  test("una cita que apunta a un paciente temporal depende de él", () => {
    const op = pending({
      type: "cita.create",
      citaId: "x",
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: -5, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
      subject: "Nuevo paciente",
    })
    expect(dependsOnTempPatient(op)).toBe(true)
  })

  test("un alta de paciente nunca depende de otro (aunque su id sea temporal)", () => {
    const op = pending({
      type: "paciente.create",
      patientId: -5,
      medicoCorreo: OWNER,
      input: { name: "X", birthDate: "2000-01-01", gender: "", phone: "", email: "", address: "", cp: "", notes: "" },
      subject: "X",
    })
    expect(dependsOnTempPatient(op)).toBe(false)
  })

  test("resolvePatientIds sustituye el id temporal ya resuelto", () => {
    const op = pending({ type: "paciente.update", patientId: -5, input: { name: "Y" }, subject: "Y" })
    const resolved = resolvePatientIds(op, { [-5]: 42 })
    expect(resolved.patientId).toBe(42)
    expect(dependsOnTempPatient(resolved)).toBe(false)
  })

  test("resolvePatientIds no toca un id que no está resuelto", () => {
    const op = pending({ type: "paciente.update", patientId: -5, input: {}, subject: "" })
    expect(resolvePatientIds(op, {}).patientId).toBe(-5)
  })

  test("dependsOnPendingCita detecta una cita cuya propia alta no se ha sincronizado", () => {
    const citaId = citaIdFor(OWNER, "2026-09-21", "10:00")
    const create = pending({
      type: "cita.create",
      citaId,
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: 1, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
      subject: "Ana",
    })
    const update = pending({ type: "cita.update", citaId, input: { motivo: "Otro" }, subject: "Ana" })
    const unrelated = pending({ type: "cita.update", citaId: "ya-sincronizada", input: {}, subject: "Ana" })

    expect(dependsOnPendingCita(update, [create], OWNER)).toBe(true)
    expect(dependsOnPendingCita(unrelated, [create], OWNER)).toBe(false)
    expect(dependsOnPendingCita(create, [create], OWNER)).toBe(false) // el alta no depende de sí misma
  })

  test("dependsOnPendingCita ignora las altas de otro usuario", () => {
    const citaId = citaIdFor(OWNER, "2026-09-21", "10:00")
    const create = pending(
      {
        type: "cita.create",
        citaId,
        medicoCorreo: OWNER,
        viaMedico: false,
        input: { patientId: 1, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
        subject: "Ana",
      },
      { owner: "otro@gmail.com" },
    )
    const update = pending({ type: "cita.update", citaId, input: {}, subject: "Ana" })

    expect(dependsOnPendingCita(update, [create], OWNER)).toBe(false)
  })

  test("replacePatientId reescribe toda la cola, incluidas las citas", () => {
    const create = pending({
      type: "cita.create",
      citaId: "a",
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: -5, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
      subject: "",
    })
    const other = pending({ type: "paciente.delete", patientId: 99, subject: "" })
    const [replacedCreate, untouched] = replacePatientId([create, other], -5, 42)
    expect(replacedCreate.type).toBe("cita.create")
    if (replacedCreate.type === "cita.create") expect(replacedCreate.input.patientId).toBe(42)
    expect(untouched.type === "paciente.delete" && untouched.patientId).toBe(99)
  })
})

describe("addOperation: citas", () => {
  test("editar una cita creada sin conexión funde el cambio en el alta", () => {
    const create = pending({
      type: "cita.create",
      citaId: citaIdFor(OWNER, "2026-09-21", "10:00"),
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: 1, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "Limpieza" },
      subject: "Ana",
    })
    const update = pending({
      type: "cita.update",
      citaId: create.type === "cita.create" ? create.citaId : "",
      input: { motivo: "Revisión" },
      subject: "Ana",
    })

    const queue = addOperation([create], update)

    expect(queue).toHaveLength(1)
    expect(queue[0].type).toBe("cita.create")
    if (queue[0].type === "cita.create") expect(queue[0].input.motivo).toBe("Revisión")
  })

  test("si la edición mueve la cita, su id cambia (sigue a fecha y hora)", () => {
    const citaId = citaIdFor(OWNER, "2026-09-21", "10:00")
    const create = pending({
      type: "cita.create",
      citaId,
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: 1, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
      subject: "Ana",
    })
    const update = pending({
      type: "cita.update",
      citaId,
      input: { time: "11:00" },
      subject: "Ana",
    })

    const [merged] = addOperation([create], update)
    const expectedId = citaIdFor(OWNER, "2026-09-21", "11:00")
    expect(merged.type === "cita.create" && merged.citaId).toBe(expectedId)
  })

  test("dos ediciones sucesivas de una cita ya sincronizada se funden en una", () => {
    const first = pending({ type: "cita.update", citaId: "c1", input: { motivo: "A" }, subject: "Ana" })
    const second = pending({ type: "cita.update", citaId: "c1", input: { status: "completada" }, subject: "Ana" })

    const queue = addOperation([first], second)

    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({ input: { motivo: "A", status: "completada" } })
  })

  test("borrar una cita creada sin conexión la saca de la cola sin llegar al servidor", () => {
    const citaId = citaIdFor(OWNER, "2026-09-21", "10:00")
    const create = pending({
      type: "cita.create",
      citaId,
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: 1, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
      subject: "Ana",
    })
    const del = pending({ type: "cita.delete", citaId, subject: "Ana" })

    expect(addOperation([create], del)).toEqual([])
  })

  test("borrar una cita ya sincronizada descarta ediciones pendientes y agrega el borrado", () => {
    const update = pending({ type: "cita.update", citaId: "c1", input: { motivo: "A" }, subject: "Ana" })
    const del = pending({ type: "cita.delete", citaId: "c1", subject: "Ana" })

    const queue = addOperation([update], del)

    expect(queue).toHaveLength(1)
    expect(queue[0].type).toBe("cita.delete")
  })

  test("no toca los cambios de otro usuario", () => {
    const ajeno = pending(
      { type: "cita.update", citaId: "c1", input: { motivo: "otro" }, subject: "" },
      { owner: "otro@gmail.com" },
    )
    const mio = pending({ type: "cita.update", citaId: "c1", input: { motivo: "mío" }, subject: "" })

    const queue = addOperation([ajeno], mio)

    expect(queue).toHaveLength(2)
  })
})

describe("addOperation: pacientes", () => {
  test("dos ediciones del mismo expediente se funden", () => {
    const first = pending({ type: "paciente.update", patientId: 1, input: { phone: "111" }, subject: "Ana" })
    const second = pending({ type: "paciente.update", patientId: 1, input: { notes: "Alergias" }, subject: "Ana" })

    const queue = addOperation([first], second)

    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({ input: { phone: "111", notes: "Alergias" } })
  })

  test("dar de baja a un paciente creado sin conexión descarta su alta y lo que dependía de él", () => {
    const create = pending({
      type: "paciente.create",
      patientId: -5,
      medicoCorreo: OWNER,
      input: { name: "X", birthDate: "2000-01-01", gender: "", phone: "", email: "", address: "", cp: "", notes: "" },
      subject: "X",
    })
    const update = pending({ type: "paciente.update", patientId: -5, input: { phone: "111" }, subject: "X" })
    const historial = pending({ type: "historial.create", patientId: -5, answers: {}, subject: "X" })
    const del = pending({ type: "paciente.delete", patientId: -5, subject: "X" })

    expect(addOperation([create, update, historial], del)).toEqual([])
  })

  test("dar de baja a un paciente ya sincronizado descarta ediciones y agrega la baja", () => {
    const update = pending({ type: "paciente.update", patientId: 1, input: { phone: "111" }, subject: "Ana" })
    const historial = pending({ type: "historial.update", patientId: 1, answers: {}, subject: "Ana" })
    const del = pending({ type: "paciente.delete", patientId: 1, subject: "Ana" })

    const queue = addOperation([update, historial], del)

    expect(queue).toHaveLength(1)
    expect(queue[0].type).toBe("paciente.delete")
  })
})

describe("addOperation: historial clínico", () => {
  test("un alta seguida de una edición sigue siendo un alta, con las respuestas combinadas", () => {
    const create = pending({
      type: "historial.create",
      patientId: 1,
      answers: { pregunta_1: "No" },
      subject: "Ana",
    })
    const update = pending({
      type: "historial.update",
      patientId: 1,
      answers: { pregunta_2: "Penicilina" },
      subject: "Ana",
    })

    const queue = addOperation([create], update)

    expect(queue).toHaveLength(1)
    expect(queue[0].type).toBe("historial.create")
    expect(queue[0]).toMatchObject({
      answers: { pregunta_1: "No", pregunta_2: "Penicilina" },
    })
  })
})

describe("findConflict", () => {
  const existing: Appointment = {
    id: "c1",
    patientId: 6,
    patientName: "José Ricardo",
    date: "2026-09-22",
    time: "10:00",
    endTime: "11:00",
    status: "no_asistio",
    motivo: "",
  }

  test("detecta otra cita a la misma fecha y hora exactas", () => {
    expect(findConflict([existing], "2026-09-22", "10:00")).toBe(existing)
  })

  test("no hay conflicto en otra fecha, otra hora, o sin citas", () => {
    expect(findConflict([existing], "2026-09-23", "10:00")).toBeUndefined()
    expect(findConflict([existing], "2026-09-22", "11:00")).toBeUndefined()
    expect(findConflict([], "2026-09-22", "10:00")).toBeUndefined()
  })

  test("excludeId permite que una cita se mueva a la hora que ya tenía", () => {
    expect(findConflict([existing], "2026-09-22", "10:00", "c1")).toBeUndefined()
  })
})

describe("applyToAppointments", () => {
  const scope = agendaScope(OWNER, null, { year: 2026, week: 39 })

  test("agrega una cita creada sin conexión dentro de la semana visible", () => {
    const create = pending({
      type: "cita.create",
      citaId: "nueva",
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: 1, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "Limpieza" },
      subject: "Ana",
    })

    const result = applyToAppointments([], [create], scope)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: "nueva", patientName: "Ana", date: "2026-09-21" })
  })

  test("no agrega una cita creada para otro médico", () => {
    const create = pending({
      type: "cita.create",
      citaId: "nueva",
      medicoCorreo: "otro-medico@gmail.com",
      viaMedico: true,
      input: { patientId: 1, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
      subject: "Ana",
    })

    expect(applyToAppointments([], [create], scope)).toEqual([])
  })

  test("una cita movida fuera de la semana visible desaparece de esta vista", () => {
    const existing: Appointment = {
      id: "c1",
      patientId: 1,
      patientName: "Ana",
      date: "2026-09-21",
      time: "10:00",
      endTime: "11:00",
      status: "no_asistio",
      motivo: "",
    }
    const update = pending({
      type: "cita.update",
      citaId: "c1",
      input: { date: "2026-10-05" },
      subject: "Ana",
    })

    expect(applyToAppointments([existing], [update], scope)).toEqual([])
  })

  test("reasignar el paciente de una cita también cambia el nombre que se muestra", () => {
    const existing: Appointment = {
      id: "c1",
      patientId: 1,
      patientName: "Ana",
      date: "2026-09-21",
      time: "10:00",
      endTime: "11:00",
      status: "no_asistio",
      motivo: "",
    }
    const update = pending({
      type: "cita.update",
      citaId: "c1",
      input: { patientId: 2 },
      subject: "Luis",
    })

    expect(applyToAppointments([existing], [update], scope)[0]).toMatchObject({
      patientId: 2,
      patientName: "Luis",
    })
  })

  test("borra una cita existente", () => {
    const existing: Appointment = {
      id: "c1",
      patientId: 1,
      patientName: "Ana",
      date: "2026-09-21",
      time: "10:00",
      endTime: "11:00",
      status: "no_asistio",
      motivo: "",
    }
    const del = pending({ type: "cita.delete", citaId: "c1", subject: "Ana" })

    expect(applyToAppointments([existing], [del], scope)).toEqual([])
  })

  test("un alta encolada antes de existir la hora de fin dura una hora", () => {
    const legacy = pending({
      type: "cita.create",
      citaId: "vieja",
      medicoCorreo: OWNER,
      viaMedico: false,
      // Así quedó guardada en `localStorage`: sin `endTime`.
      input: { patientId: 1, date: "2026-09-21", time: "10:30", status: "confirmada", motivo: "" } as never,
      subject: "Ana",
    })

    const [result] = applyToAppointments([], [legacy], scope)
    expect(result.endTime).toBe("11:30")
  })

  test("un estatus encolado que ya no existe (el antiguo «pendiente») se muestra como no asistió", () => {
    const existing: Appointment = {
      id: "c1",
      patientId: 1,
      patientName: "Ana",
      date: "2026-09-21",
      time: "10:00",
      endTime: "11:00",
      status: "confirmada",
      motivo: "",
    }
    const create = pending({
      type: "cita.create",
      citaId: "nueva",
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: 1, date: "2026-09-22", time: "10:00", endTime: "11:00", status: "pendiente" as never, motivo: "" },
      subject: "Ana",
    })
    const update = pending({ type: "cita.update", citaId: "c1", input: { status: "pendiente" as never }, subject: "Ana" })

    const result = applyToAppointments([existing], [create, update], scope)
    expect(result.map((a) => a.status)).toEqual(["no_asistio", "no_asistio"])
  })

  test("mover una cita sin indicar la hora de fin conserva su duración", () => {
    const existing: Appointment = {
      id: "c1",
      patientId: 1,
      patientName: "Ana",
      date: "2026-09-21",
      time: "10:00",
      endTime: "11:30",
      status: "confirmada",
      motivo: "",
    }
    const moved = pending({ type: "cita.update", citaId: "c1", input: { time: "12:00" }, subject: "Ana" })
    const resized = pending({
      type: "cita.update",
      citaId: "c1",
      input: { time: "12:00", endTime: "12:30" },
      subject: "Ana",
    })

    expect(applyToAppointments([existing], [moved], scope)[0]).toMatchObject({
      time: "12:00",
      endTime: "13:30",
    })
    expect(applyToAppointments([existing], [resized], scope)[0].endTime).toBe("12:30")
  })

  test("un cambio de nombre del paciente se refleja en sus citas ya listadas", () => {
    const existing: Appointment = {
      id: "c1",
      patientId: 1,
      patientName: "Ana",
      date: "2026-09-21",
      time: "10:00",
      endTime: "11:00",
      status: "no_asistio",
      motivo: "",
    }
    const rename = pending({ type: "paciente.update", patientId: 1, input: { name: "Ana López" }, subject: "Ana" })

    const [result] = applyToAppointments([existing], [rename], scope)
    expect(result.patientName).toBe("Ana López")
  })
})

describe("applyToPatients", () => {
  test("agrega el alta con id temporal y no la duplica si ya está en la lista", () => {
    const op = pending({
      type: "paciente.create",
      patientId: -5,
      medicoCorreo: OWNER,
      input: { name: "X", birthDate: "2000-01-01", gender: "", phone: "", email: "", address: "", cp: "", notes: "" },
      subject: "X",
    })

    const once = applyToPatients([], [op], OWNER)
    expect(once).toHaveLength(1)
    expect(once[0].id).toBe(-5)

    const twice = applyToPatients(once, [op], OWNER)
    expect(twice).toHaveLength(1)
  })

  test("una baja quita al paciente de la lista", () => {
    const del = pending({ type: "paciente.delete", patientId: 1, subject: "Ana" })
    expect(applyToPatients([PATIENT], [del], OWNER)).toEqual([])
  })
})

describe("applyToPatient", () => {
  const NOW = new Date(2026, 8, 20, 9, 0)

  test("reconstruye el expediente de un alta pendiente", () => {
    const op = pending({
      type: "paciente.create",
      patientId: -5,
      medicoCorreo: OWNER,
      input: {
        name: "X",
        birthDate: "2000-01-01",
        gender: "Femenino",
        phone: "",
        email: "",
        address: "",
        cp: "",
        notes: "",
      },
      subject: "X",
    })

    const patient = applyToPatient(undefined, -5, [op], NOW)
    expect(patient?.name).toBe("X")
    expect(patient?.id).toBe(-5)
  })

  test("una cita nueva futura entra a próximas citas; una pasada no", () => {
    const future = pending({
      type: "cita.create",
      citaId: "f1",
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: 1, date: "2026-09-21", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
      subject: "Ana",
    })
    const past = pending({
      type: "cita.create",
      citaId: "p1",
      medicoCorreo: OWNER,
      viaMedico: false,
      input: { patientId: 1, date: "2026-01-01", time: "10:00", endTime: "11:00", status: "no_asistio", motivo: "" },
      subject: "Ana",
    })

    const patient = applyToPatient(PATIENT, 1, [future, past], NOW)
    expect(patient?.upcoming.map((a) => a.id)).toEqual(["f1"])
  })

  test("el historial clínico se combina sobre el actual", () => {
    const withHistory: Patient = {
      ...PATIENT,
      clinicalHistory: mergeClinicalHistory(null, { pregunta_1: "No" }),
    }
    const update = pending({
      type: "historial.update",
      patientId: 1,
      answers: { pregunta_2: "Penicilina" },
      subject: "Ana",
    })

    const patient = applyToPatient(withHistory, 1, [update], NOW)
    expect(patient?.clinicalHistory?.pregunta_1).toBe("No")
    expect(patient?.clinicalHistory?.pregunta_2).toBe("Penicilina")
  })

  test("una baja deja el expediente en undefined", () => {
    const del = pending({ type: "paciente.delete", patientId: 1, subject: "Ana" })
    expect(applyToPatient(PATIENT, 1, [del], NOW)).toBeUndefined()
  })
})

describe("mergeClinicalHistory", () => {
  test("una respuesta omitida conserva la anterior; en blanco la borra", () => {
    const current: ClinicalHistory = mergeClinicalHistory(null, {
      pregunta_1: "No",
      pregunta_2: "Penicilina",
    })
    const merged = mergeClinicalHistory(current, { pregunta_2: "   " })
    expect(merged.pregunta_1).toBe("No")
    expect(merged.pregunta_2).toBe("")
  })
})

describe("describeOperation", () => {
  test("describe un cambio de estatus de forma distinta a otros cambios", () => {
    const status = { type: "cita.update", citaId: "c1", input: { status: "completada" as const }, subject: "Ana" }
    const other = { type: "cita.update", citaId: "c1", input: { motivo: "Otro" }, subject: "Ana" }
    expect(describeOperation(status)).toContain("Estatus")
    expect(describeOperation(other)).not.toContain("Estatus")
  })

  test("un estatus que ya no existe (el antiguo «pendiente») se describe como «No asistió»", () => {
    const legacy = { type: "cita.update", citaId: "c1", input: { status: "pendiente" as never }, subject: "Ana" }
    expect(describeOperation(legacy)).toBe("Estatus «No asistió» en la cita de Ana")
  })

  test("un paciente sin nombre todavía es legible", () => {
    expect(describeOperation({ type: "paciente.delete", patientId: 1, subject: "" })).toBe(
      "Baja de paciente sin nombre",
    )
  })
})
