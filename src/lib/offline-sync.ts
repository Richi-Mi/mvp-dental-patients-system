import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { offlineActions } from "@/actions"
import { ApiError, isNetworkError } from "@/api/client"
import {
  MAX_SERVER_ERRORS,
  dependsOnTempPatient,
  describeOperation,
  patientIdOf,
  resolvePatientIds,
  type PendingOperation,
} from "@/lib/offline-queue"
import { queryKeys } from "@/lib/query-keys"
import { isOnlineNow } from "@/lib/save-or-queue"
import { useAuthStore } from "@/store/auth.store"
import { useOfflineStore } from "@/store/offline.store"

/** Cambios sin sincronizar de la sesión activa, en el orden en que se hicieron. */
export function ownPendingOperations(): PendingOperation[] {
  const owner = useAuthStore.getState().usuario?.correo
  if (!owner) return []
  return useOfflineStore.getState().operations.filter((op) => op.owner === owner)
}

/**
 * Reenvía al servidor los cambios pendientes del usuario activo, en orden.
 *
 * - Un cambio que depende de un paciente creado sin conexión (id temporal) se
 *   deja en la cola hasta que ese alta se sincronice en este mismo recorrido.
 * - Un error de red detiene el recorrido: ya no hay conexión, así que el resto
 *   espera al siguiente intento.
 * - Un 4xx (validación, 404, 409…) no se puede reintentar tal cual: se
 *   descarta y se avisa. Un 5xx se reintenta hasta `MAX_SERVER_ERRORS` veces
 *   entre recorridos distintos antes de descartarse.
 *
 * No es reentrante (`useOfflineStore.isSyncing` lo evita); se llama tanto
 * desde el botón de la agenda como automáticamente al recuperar conexión.
 */
export async function runSync(queryClient: QueryClient): Promise<void> {
  const store = useOfflineStore.getState()
  if (store.isSyncing) return
  const owner = useAuthStore.getState().usuario?.correo
  if (!owner || !isOnlineNow()) return

  const pending = ownPendingOperations()
  if (pending.length === 0) return

  store.setSyncing(true)
  let synced = 0
  const discarded: string[] = []
  const resolved: Record<number, number> = {}
  let stoppedByNetwork = false

  try {
    for (const op of pending) {
      // Ya se resolvió antes en este mismo recorrido, o se descartó: no se
      // reevalúa contra la cola guardada (que solo se actualiza al final de
      // cada paso exitoso).
      if (!useOfflineStore.getState().operations.some((o) => o.id === op.id)) continue

      const resolvedOp = resolvePatientIds(op, resolved)
      if (dependsOnTempPatient(resolvedOp)) continue // su paciente aún no se sincroniza

      try {
        const result = await offlineActions.sendOperation(resolvedOp)
        if (resolvedOp.type === "paciente.create" && typeof result === "number") {
          resolved[resolvedOp.patientId] = result
          useOfflineStore.getState().resolvePatientId(resolvedOp.patientId, result)
        }
        useOfflineStore.getState().remove(op.id)
        synced += 1
      } catch (error) {
        if (isNetworkError(error)) {
          stoppedByNetwork = true
          break
        }
        const status = error instanceof ApiError ? error.status : 0
        if (status >= 500) {
          const attempts = useOfflineStore.getState().countServerError(op.id)
          if (attempts < MAX_SERVER_ERRORS) continue // se reintenta en el próximo recorrido
        }
        // 4xx, o un 5xx que ya agotó sus reintentos: no se puede aplicar.
        // Se muestra también el motivo del servidor (p. ej. un horario ya
        // ocupado por otra cita) y no solo qué cambio era.
        const reason = error instanceof ApiError ? error.message : "error del servidor"
        useOfflineStore.getState().remove(op.id)
        discarded.push(`${describeOperation(resolvedOp)} — ${reason}`)

        // Nada de lo que dependía de este alta llegará a tener un paciente
        // real: se descarta también, o se quedaría esperando para siempre.
        if (resolvedOp.type === "paciente.create") {
          const owner = useAuthStore.getState().usuario?.correo
          const dependents = useOfflineStore
            .getState()
            .operations.filter(
              (o) => o.owner === owner && patientIdOf(o) === resolvedOp.patientId,
            )
          for (const dependent of dependents) {
            useOfflineStore.getState().remove(dependent.id)
            discarded.push(describeOperation(dependent))
          }
        }
      }
    }
  } finally {
    store.setSyncing(false)
  }

  if (synced > 0) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ])
    toast.success(
      synced === 1 ? "1 cambio sincronizado." : `${synced} cambios sincronizados.`,
    )
  }

  if (discarded.length > 0) {
    toast.error(
      `No se pudieron aplicar ${discarded.length === 1 ? "1 cambio" : `${discarded.length} cambios`}: ${discarded.join("; ")}.`,
      // Se queda hasta que el usuario lo cierre con la "x": son cambios
      // perdidos (p. ej. citas que no se crearon) y debe alcanzar a leerlo.
      { duration: Infinity, closeButton: true },
    )
  }

  if (stoppedByNetwork) useOfflineStore.getState().setReachable(false)
}

/**
 * Punto de entrada real de la recuperación: se llama al recuperar conexión, al
 * montar la app y cada `RETRY_INTERVAL_MS` (ver `useOfflineSync`) — sin
 * importar si hay cambios pendientes.
 *
 * `runSync` por sí solo reintenta la cola, pero **no** repara las consultas de
 * lectura (agenda, pacientes, médicos…) que ya fallaron: una vez que una
 * `useQuery` falla por falta de red se queda en ese estado y no vuelve a
 * intentarlo sola (no hay reintento automático para un error de red, y el
 * evento `online` del navegador no llega a dispararse si fue el *servidor*
 * el que estuvo caído, no la conexión del equipo). Por eso, mientras no se
 * sepa si hay conexión, aquí se refresca lo que esté montado en pantalla
 * (`refetchType: "active"`): si responde, `reachable` vuelve a `true` (lo
 * marca el interceptor de `api/client.ts`) y de paso ya quedó al día.
 */
export async function recoverConnection(queryClient: QueryClient): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return // no hay ni enlace de red

  if (!useOfflineStore.getState().reachable) {
    await queryClient.invalidateQueries({ refetchType: "active" })
  }

  await runSync(queryClient)
}
