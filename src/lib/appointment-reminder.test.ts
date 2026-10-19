import { describe, expect, test } from "bun:test"

import {
  buildReminderMessage,
  buildReminderSubject,
  emailReminderUrl,
  hasReminderEmail,
  toWhatsAppNumber,
  whatsAppReminderUrls,
} from "@/lib/appointment-reminder"

const appointment = {
  date: "2026-09-29",
  time: "11:00",
  endTime: "12:00",
  motivo: "Limpieza dental",
}

describe("toWhatsAppNumber", () => {
  test("antepone la lada de México a los números de 10 dígitos", () => {
    expect(toWhatsAppNumber("55 1234 5678")).toBe("525512345678")
    expect(toWhatsAppNumber("(55) 1234-5678")).toBe("525512345678")
  })

  test("respeta un número que ya trae lada de país", () => {
    expect(toWhatsAppNumber("+52 55 1234 5678")).toBe("525512345678")
    expect(toWhatsAppNumber("+1 (212) 555-0100")).toBe("12125550100")
  })

  test("descarta lo que no parece un teléfono", () => {
    expect(toWhatsAppNumber("")).toBeNull()
    expect(toWhatsAppNumber("   ")).toBeNull()
    expect(toWhatsAppNumber("123")).toBeNull()
    expect(toWhatsAppNumber("1234567890123456")).toBeNull()
  })
})

describe("hasReminderEmail", () => {
  test("acepta correos válidos y rechaza vacíos o incompletos", () => {
    expect(hasReminderEmail(" ana@correo.com ")).toBe(true)
    expect(hasReminderEmail("")).toBe(false)
    expect(hasReminderEmail("ana@correo")).toBe(false)
  })
})

describe("buildReminderMessage", () => {
  test("incluye el primer nombre, el día, la fecha y el horario", () => {
    const msg = buildReminderMessage({ name: "Ana López" }, appointment)
    expect(msg).toContain("Hola Ana,")
    expect(msg).toContain("martes")
    expect(msg).toContain("29 de septiembre de 2026")
    expect(msg).toContain("11:00 - 12:00 h")
  })

  test("no incluye el motivo de la cita", () => {
    const msg = buildReminderMessage({ name: "Ana" }, appointment)
    expect(msg).not.toContain("Limpieza dental")
    expect(msg).not.toContain("Motivo")
  })
})

describe("URLs del recordatorio", () => {
  test("WhatsApp abre la app o WhatsApp Web con el número normalizado y el mensaje escapado", () => {
    expect(whatsAppReminderUrls("55 1234 5678", "Hola & adiós")).toEqual({
      app: "whatsapp://send?phone=525512345678&text=Hola%20%26%20adi%C3%B3s",
      web: "https://web.whatsapp.com/send?phone=525512345678&text=Hola%20%26%20adi%C3%B3s",
    })
    expect(whatsAppReminderUrls("", "Hola")).toBeNull()
    expect(whatsAppReminderUrls("123", "Hola")).toBeNull()
  })

  test("Gmail abre la ventana de redactar con destinatario, asunto y cuerpo", () => {
    const url = emailReminderUrl(" ana@correo.com ", "Hola & adiós", appointment)
    expect(url).toStartWith("https://mail.google.com/mail/?view=cm")
    const params = new URL(url!).searchParams
    expect(params.get("to")).toBe("ana@correo.com")
    expect(params.get("su")).toBe(buildReminderSubject(appointment))
    expect(params.get("body")).toBe("Hola & adiós")
    expect(emailReminderUrl("", "Hola", appointment)).toBeNull()
  })
})

describe("buildReminderSubject", () => {
  test("el asunto lleva la fecha y el horario de la cita", () => {
    expect(buildReminderSubject(appointment)).toBe(
      "Recordatorio de cita - martes 29 de septiembre de 2026, 11:00 - 12:00 h",
    )
  })
})
