import { isNetworkError } from "@/api/client"
import {
  dependsOnPendingCita,
  dependsOnTempPatient,
  type NewOperation,
} from "@/lib/offline-queue"
import { useAuthStore } from "@/store/auth.store"
import { useOfflineStore } from "@/store/offline.store"

/** `navigator.onLine` (enlace de red) + si la última petición real respondió. */
export function isOnlineNow(): boolean {
  const browserOnline = typeof navigator === "undefined" || navigator.onLine
  return browserOnline && useOfflineStore.getState().reachable
}

/**
 * Intenta guardar en el servidor; si no hay conexión, guarda el cambio en la
 * cola sin conexión (ver `store/offline.store.ts`) y devuelve un resultado
 * construido en el cliente para que la UI siga como si se hubiera guardado.
 *
 * Ya confirmado que no hay conexión, ni lo intenta: evita que cada acción
 * espere el `timeout` completo del cliente HTTP para caer a la cola.
 *
 * Solo los errores de red (sin respuesta del servidor) se encolan; un error
 * de validación o del servidor (4xx/5xx) sigue lanzándose tal cual, haya o
 * no conexión, para no esconder un problema real detrás de "ya se guardará".
 *
 * Si el cambio depende de un paciente creado sin conexión (`dependsOnTempPatient`)
 * o de una cita creada sin conexión (`dependsOnPendingCita`) que todavía no se
 * sincronizan, ni siquiera lo intenta: el servidor no conoce ese registro
 * (aunque haya conexión) y respondería 404. Queda en la cola hasta que la
 * sincronización lo resuelva; ahí se funde con esa alta pendiente
 * (`addOperation`) en vez de sumar un cambio aparte.
 *
 * `validate`, si se da, corre justo antes de encolar (nunca antes de intentar
 * guardar en el servidor, que ya valida solo): detecta ahí lo que el servidor
 * detectaría pero que sin conexión no se puede consultar (p. ej. un horario
 * ya ocupado, ver `findConflict`). Si lanza, el cambio **no** se encola.
 */
export async function saveOrQueue<T>(params: {
  send: () => Promise<T>
  op: NewOperation
  optimistic: () => T
  validate?: () => void
}): Promise<T> {
  const owner = useAuthStore.getState().usuario?.correo
  if (!owner) throw new Error("No hay sesión activa")

  const blocked =
    dependsOnTempPatient(params.op) ||
    dependsOnPendingCita(params.op, useOfflineStore.getState().operations, owner)

  if (isOnlineNow() && !blocked) {
    try {
      return await params.send()
    } catch (error) {
      if (!isNetworkError(error)) throw error
    }
  }

  params.validate?.()
  useOfflineStore.getState().enqueue({ ...params.op, owner })
  return params.optimistic()
}
