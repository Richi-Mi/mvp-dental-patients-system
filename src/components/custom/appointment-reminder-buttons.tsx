import { Mail, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  buildReminderMessage,
  emailReminderUrl,
  whatsAppReminderUrl,
} from "@/lib/appointment-reminder"
import type { Appointment, Patient } from "@/types/clinic"

/**
 * Botones para recordarle al paciente su próxima cita. Solo abren WhatsApp o
 * Gmail con el mensaje ya escrito; el envío lo confirma quien los usa. Cada
 * botón aparece solo si el paciente tiene ese medio registrado.
 */
export function AppointmentReminderButtons({
  patient,
  appointment,
}: {
  patient: Patient
  appointment: Appointment
}) {
  if (appointment.status === "cancelada") return null

  const message = buildReminderMessage(patient, appointment)
  const whatsApp = whatsAppReminderUrl(patient.phone, message)
  const email = emailReminderUrl(patient.email, message, appointment)
  if (!whatsApp && !email) return null

  return (
    <div className="flex flex-wrap gap-2">
      {whatsApp && (
        <Button
          variant="outline"
          size="sm"
          className="max-sm:w-full"
          nativeButton={false}
          render={<a href={whatsApp} target="_blank" rel="noopener noreferrer" />}
        >
          <MessageCircle data-icon="inline-start" />
          Avisar por WhatsApp
        </Button>
      )}
      {email && (
        <Button
          variant="outline"
          size="sm"
          className="max-sm:w-full"
          nativeButton={false}
          render={<a href={email} target="_blank" rel="noopener noreferrer" />}
        >
          <Mail data-icon="inline-start" />
          Avisar por Gmail
        </Button>
      )}
    </div>
  )
}
