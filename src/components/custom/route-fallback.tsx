import { Loader2 } from "lucide-react"

/**
 * Pantalla de carga de la primera navegación (`HydrateFallback` en
 * `routes.tsx`): se ve mientras corren los loaders y se descarga el chunk de
 * una pantalla que se carga aparte.
 */
export function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex min-h-svh items-center justify-center bg-background"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
