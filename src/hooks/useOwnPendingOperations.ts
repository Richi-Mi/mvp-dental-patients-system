import * as React from "react"

import type { PendingOperation } from "@/lib/offline-queue"
import { useAuthStore } from "@/store/auth.store"
import { useOfflineStore } from "@/store/offline.store"

/**
 * Cambios sin sincronizar del usuario activo (ver `lib/offline-queue.ts` y
 * `store/offline.store.ts`), en el orden en que se hicieron. Los cambios de
 * otra sesión guardados en este mismo equipo no se muestran ni se sincronizan
 * mientras esa persona no vuelva a iniciar sesión.
 */
export function useOwnPendingOperations(): PendingOperation[] {
  const owner = useAuthStore((s) => s.usuario?.correo)
  const allPending = useOfflineStore((s) => s.operations)
  return React.useMemo(
    () => (owner ? allPending.filter((op) => op.owner === owner) : []),
    [allPending, owner],
  )
}
