"use client"

import { Loader2, RefreshCw, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useOfflineStatus, useSyncNow } from "@/hooks/useOfflineSync"
import { cn } from "@/lib/utils"

/**
 * Botón de sincronización: solo existe mientras hay cambios sin sincronizar
 * (hechos sin conexión, o pendientes de reintento). Mientras no hay conexión
 * solo informa cuántos cambios esperan, pero sigue activo: al pulsarlo prueba
 * si ya hay conexión en vez de esperar al reintento automático, útil si el
 * servidor volvió y todavía no toca el siguiente intento (ver `useOfflineSync`).
 */
export function SyncButton() {
  const { isOnline, pendingCount, isSyncing } = useOfflineStatus()
  const sync = useSyncNow()

  if (pendingCount === 0) return null

  const label = isSyncing
    ? "Sincronizando..."
    : isOnline
      ? "Sincronizar"
      : "Sin conexión"

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isSyncing}
      onClick={() => sync()}
      title={
        isOnline
          ? "Enviar ahora los cambios pendientes"
          : "Los cambios se guardaron en este dispositivo; toca para reintentar ahora"
      }
      className={cn(!isOnline && "text-amber-700 dark:text-amber-500")}
    >
      {isSyncing ? (
        <Loader2 className="animate-spin" data-icon="inline-start" />
      ) : isOnline ? (
        <RefreshCw data-icon="inline-start" />
      ) : (
        <WifiOff data-icon="inline-start" />
      )}
      {label}
      <span
        className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums"
        aria-hidden="true"
      >
        {pendingCount}
      </span>
      <span className="sr-only">
        {pendingCount === 1 ? "1 cambio sin sincronizar" : `${pendingCount} cambios sin sincronizar`}
      </span>
    </Button>
  )
}
