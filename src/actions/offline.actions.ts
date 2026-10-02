import { ApiError } from "@/api/client"
import type { OfflineOperation } from "@/lib/offline-queue"
import {
  createAppointment,
  deleteAppointment,
  updateAppointment,
} from "./citas.actions"
import {
  createClinicalHistory,
  updateClinicalHistory,
} from "./historial.actions"
import { createPatient, deletePatient, updatePatient } from "./pacientes.actions"

/**
 * Envía al backend un cambio que se guardó sin conexión. Devuelve el id real
 * cuando es el alta de un paciente (hasta entonces tenía uno temporal).
 */
export async function sendOperation(op: OfflineOperation): Promise<number | void> {
  switch (op.type) {
    case "cita.create":
      await createAppointment(op.input, op.viaMedico ? op.medicoCorreo : null)
      return
    case "cita.update":
      await updateAppointment(op.citaId, op.input, op.medicoCorreo)
      return
    case "cita.delete":
      await deleteAppointment(op.citaId, op.medicoCorreo)
      return
    case "paciente.create": {
      const patient = await createPatient({ ...op.input, medicoEmail: op.medicoCorreo })
      return patient.id
    }
    case "paciente.update":
      await updatePatient(op.patientId, op.input)
      return
    case "paciente.delete":
      await deletePatient(op.patientId)
      return
    case "historial.create":
      try {
        await createClinicalHistory(op.patientId, op.answers)
      } catch (error) {
        // Ya existe (lo capturó alguien más, o un intento anterior sí llegó
        // aunque no hubo respuesta): se guardan las respuestas como edición.
        if (!(error instanceof ApiError && error.status === 409)) throw error
        await updateClinicalHistory(op.patientId, op.answers)
      }
      return
    case "historial.update":
      await updateClinicalHistory(op.patientId, op.answers)
      return
  }
}
