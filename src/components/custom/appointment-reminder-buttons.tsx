import { ExternalLink, Mail, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  buildReminderMessage,
  emailReminderUrl,
  whatsAppReminderUrls,
} from "@/lib/appointment-reminder"
import type { Appointment, Patient } from "@/types/clinic"

/**
 * Botones para recordarle al paciente su próxima cita. Solo abren WhatsApp o
 * Gmail con el mensaje ya escrito; el envío lo confirma quien los usa. Cada
 * botón aparece solo si el paciente tiene ese medio registrado.
 *
 * "Avisar por WhatsApp" abre la app instalada, sin `target`: un enlace
 * `whatsapp://` no saca de esta página, y la app reutiliza su ventana. "WhatsApp
 * Web" es el respaldo para equipos sin la app, y ese sí abre una pestaña (ver
 * `whatsAppReminderUrls`); se oculta en teléfonos, donde siempre está la app.
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
  const whatsApp = whatsAppReminderUrls(patient.phone, message)
  const email = emailReminderUrl(patient.email, message, appointment)
  if (!whatsApp && !email) return null

  return (
    <div className="flex flex-wrap gap-2">
      {whatsApp && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="max-sm:w-full"
            nativeButton={false}
            render={<a href={whatsApp.app} />}
          >
            <MessageCircle data-icon="inline-start" />
            Avisar por WhatsApp
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="max-sm:hidden"
            nativeButton={false}
            title="Para equipos sin la app de WhatsApp"
            render={<a href={whatsApp.web} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink data-icon="inline-start" />
            WhatsApp Web
          </Button>
        </>
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
