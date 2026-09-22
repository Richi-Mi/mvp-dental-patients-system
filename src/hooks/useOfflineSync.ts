import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { ownPendingOperations, recoverConnection } from "@/lib/offline-sync"
import { useAuthStore } from "@/store/auth.store"
import { useOfflineStore } from "@/store/offline.store"

/**
 * Cada cuánto se prueba si ya hay conexión y se reintenta la cola pendiente
 * (ver `useOfflineSync`), sin importar si algo la disparó antes: es la única
 * manera de notar que el *servidor* volvió cuando la conexión del equipo
 * nunca llegó a caerse (el evento `online` del navegador no avisa de eso).
 */
const RETRY_INTERVAL_MS = 15_000

/** Estado (sin efectos) de la sincronización, para componentes de solo lectura. */
export function useOfflineStatus() {
  const usuario = useAuthStore((s) => s.usuario)
  const allOperations = useOfflineStore((s) => s.operations)
  const reachable = useOfflineStore((s) => s.reachable)
  const isSyncing = useOfflineStore((s) => s.isSyncing)
  const [browserOnline, setBrowserOnline] = React.useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  )

  React.useEffect(() => {
    const goOnline = () => setBrowserOnline(true)
    const goOffline = () => setBrowserOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  const pendingCount = React.useMemo(
    () => (usuario ? allOperations.filter((op) => op.owner === usuario.correo).length : 0),
    [allOperations, usuario],
  )

  // No hace de `reachable` una fuente independiente de "sin conexión": una
  // petición que aún no ha corrido no debe mostrarse como offline.
  return { isOnline: browserOnline && reachable, pendingCount, isSyncing }
}

/**
 * Motor de la sincronización: además del estado de `useOfflineStatus`,
 * escucha conexión/desconexión y, al recuperarla (o cada `RETRY_INTERVAL_MS`
 * mientras no se sepa si ya volvió), refresca las consultas activas y
 * reintenta la cola pendiente (`recoverConnection` en `lib/offline-sync.ts`).
 *
 * Se monta **una sola vez**, en `AppLayout`, para que sincronice sin importar
 * en qué pantalla esté el usuario. Los demás componentes (el botón de la
 * agenda) usan `useOfflineStatus` + `useSyncNow` en vez de este hook, para no
 * duplicar los temporizadores.
 */
export function useOfflineSync() {
  const status = useOfflineStatus()
  const sync = useSyncNow()

  React.useEffect(() => {
    window.addEventListener("online", sync)
    return () => window.removeEventListener("online", sync)
  }, [sync])

  // Al montar puede que ya haya conexión (o cambios de una sesión anterior):
  // se intenta una vez de entrada, sin esperar al primer intervalo.
  React.useEffect(() => {
    sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Solo al montar; `sync` ya reacciona a sus propios disparadores (evento online, intervalo).
  }, [])

  // Reintenta sin parar: mientras no haya conexión, para notar en cuanto
  // vuelva (aunque haya sido el servidor, no el equipo, el que estuvo caído);
  // con conexión, para lo que haya quedado por un 500 o una cita que dependía
  // de un alta que aún no se sincronizaba.
  React.useEffect(() => {
    const id = window.setInterval(sync, RETRY_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [sync])

  return { ...status, sync }
}

/** Fuerza un intento de recuperación/sincronización ahora mismo. */
export function useSyncNow() {
  const queryClient = useQueryClient()
  return React.useCallback(() => {
    void recoverConnection(queryClient)
  }, [queryClient])
}

/** Cuenta actual sin necesidad de suscribirse (para lecturas puntuales). */
export function pendingCountNow(): number {
  return ownPendingOperations().length
}
