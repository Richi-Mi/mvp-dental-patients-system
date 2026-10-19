import {
  formatDayName,
  formatLongDate,
  formatTimeRange,
} from "@/lib/clinic-data"
import type { Appointment, Patient } from "@/types/clinic"

export const CLINIC_NAME = "Odontología Familiar GC"

/** Lada de México, que se antepone a los números capturados a 10 dígitos. */
const MX_COUNTRY_CODE = "52"

/**
 * Número en el formato que espera WhatsApp (solo dígitos, con lada de país), o
 * `null` si lo capturado no parece un teléfono. El teléfono es texto libre,
 * así que puede traer espacios, guiones, paréntesis o `+`.
 */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return MX_COUNTRY_CODE + digits
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

export function hasReminderEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Texto del recordatorio, igual para WhatsApp y correo. No lleva el motivo de
 * la cita.
 */
export function buildReminderMessage(
  patient: Pick<Patient, "name">,
  appointment: Pick<Appointment, "date" | "time" | "endTime">,
): string {
  const firstName = patient.name.trim().split(/\s+/)[0] ?? ""
  const day = formatDayName(appointment.date).toLowerCase()
  const date = formatLongDate(appointment.date)
  const time = formatTimeRange(appointment.time, appointment.endTime)
  return (
    `Hola ${firstName}, le recordamos su próxima cita en ${CLINIC_NAME} ` +
    `el ${day} ${date}, de ${time} h. ` +
    "Si no puede asistir, por favor avísenos para reprogramarla. ¡Gracias!"
  )
}

/**
 * Enlaces para mandar el recordatorio por WhatsApp, con el chat y el mensaje
 * ya escritos, o `null` si el teléfono no sirve:
 *
 * - `app` abre la app de WhatsApp (escritorio o celular) y, si ya está
 *   abierta, cambia esa misma ventana al chat. Es el principal porque WhatsApp
 *   Web no se puede reutilizar: su `Cross-Origin-Opener-Policy` corta el
 *   vínculo con la pestaña que lo abrió y le borra el nombre, así que cada
 *   aviso abriría una pestaña nueva aunque se le diera un `target` fijo.
 * - `web` es el respaldo para un equipo sin la app. Va directo a WhatsApp Web,
 *   sin la página intermedia de `wa.me`; en celulares no funciona.
 */
export function whatsAppReminderUrls(
  phone: string,
  message: string,
): { app: string; web: string } | null {
  const number = toWhatsAppNumber(phone)
  if (!number) return null
  const query = `phone=${number}&text=${encodeURIComponent(message)}`
  return {
    app: `whatsapp://send?${query}`,
    web: `https://web.whatsapp.com/send?${query}`,
  }
}

/** `"Recordatorio de cita - lunes 28 de septiembre de 2026, 11:00 - 12:00 h"`. */
export function buildReminderSubject(
  appointment: Pick<Appointment, "date" | "time" | "endTime">,
): string {
  const day = formatDayName(appointment.date).toLowerCase()
  const date = formatLongDate(appointment.date)
  const time = formatTimeRange(appointment.time, appointment.endTime)
  return `Recordatorio de cita - ${day} ${date}, ${time} h`
}

/**
 * Abre la ventana de redactar de Gmail en el navegador con destinatario,
 * asunto y mensaje ya llenos. Se usa en vez de `mailto:` porque este depende
 * de que el equipo tenga una app de correo configurada, y si no la tiene el
 * clic no hace nada.
 */
export function emailReminderUrl(
  email: string,
  message: string,
  appointment: Pick<Appointment, "date" | "time" | "endTime">,
): string | null {
  if (!hasReminderEmail(email)) return null
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email.trim(),
    su: buildReminderSubject(appointment),
    body: message,
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}
