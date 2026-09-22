import { create } from "zustand"

import {
  addOperation,
  replacePatientId,
  type NewOperation,
  type PendingOperation,
} from "@/lib/offline-queue"

export const OFFLINE_STORAGE_KEY = "dentalcare.offline"

type Persisted = { version: 1; operations: PendingOperation[] }

/** `null` si `localStorage` no está disponible (modo privado, bloqueado…). */
function readOperations(): PendingOperation[] | null {
  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return Array.isArray(parsed.operations) ? parsed.operations : []
  } catch {
    return null
  }
}

function writeOperations(operations: PendingOperation[]) {
  try {
    const data: Persisted = { version: 1, operations }
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    // Sin espacio o sin almacenamiento: la cola sigue viva en memoria.
    console.error("No se pudo guardar la cola sin conexión", error)
  }
}

function newId(): string {
  // `crypto.randomUUID` solo existe en HTTPS/localhost.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export type OfflineState = {
  /** Cambios sin sincronizar de todos los usuarios de este equipo, en orden. */
  operations: PendingOperation[]
  /** `false` desde que una petición falla por red hasta que otra responde. */
  reachable: boolean
  isSyncing: boolean
  /**
   * Id real de los pacientes creados sin conexión que ya se sincronizaron,
   * para redirigir las pantallas que aún usan el temporal. Solo en memoria.
   */
  resolvedPatientIds: Record<number, number>
  enqueue: (op: NewOperation & { owner: string }) => PendingOperation
  remove: (id: string) => void
  /** Suma un 500 al cambio y devuelve cuántos lleva. */
  countServerError: (id: string) => number
  resolvePatientId: (tempId: number, realId: number) => void
  /** Relee la cola de `localStorage` (otra pestaña pudo cambiarla). */
  refresh: () => PendingOperation[]
  setReachable: (reachable: boolean) => void
  setSyncing: (isSyncing: boolean) => void
}

/**
 * Cola de cambios hechos sin conexión (ver `lib/offline-queue.ts`), guardada
 * en `localStorage`. Cada cambio relee la cola antes de escribirla, así que
 * dos pestañas abiertas no se pisan lo que agregó la otra.
 */
export const useOfflineStore = create<OfflineState>()((set, get) => {
  function update(fn: (operations: PendingOperation[]) => PendingOperation[]) {
    const next = fn(readOperations() ?? get().operations)
    writeOperations(next)
    set({ operations: next })
  }

  return {
    operations: readOperations() ?? [],
    reachable: true,
    isSyncing: false,
    resolvedPatientIds: {},

    enqueue: (op) => {
      const pending: PendingOperation = {
        ...op,
        id: newId(),
        createdAt: new Date().toISOString(),
      }
      update((operations) => addOperation(operations, pending))
      return pending
    },

    remove: (id) => update((operations) => operations.filter((op) => op.id !== id)),

    countServerError: (id) => {
      update((operations) =>
        operations.map((op) =>
          op.id === id ? { ...op, attempts: (op.attempts ?? 0) + 1 } : op,
        ),
      )
      return get().operations.find((op) => op.id === id)?.attempts ?? 0
    },

    resolvePatientId: (tempId, realId) => {
      update((operations) => replacePatientId(operations, tempId, realId))
      set((state) => ({
        resolvedPatientIds: { ...state.resolvedPatientIds, [tempId]: realId },
      }))
    },

    refresh: () => {
      const operations = readOperations()
      if (operations) set({ operations })
      return get().operations
    },

    setReachable: (reachable) => {
      if (get().reachable !== reachable) set({ reachable })
    },
    setSyncing: (isSyncing) => set({ isSyncing }),
  }
})

// Lo que otra pestaña agrega o sincroniza se refleja aquí.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === OFFLINE_STORAGE_KEY || event.key === null) {
      useOfflineStore.getState().refresh()
    }
  })
}
