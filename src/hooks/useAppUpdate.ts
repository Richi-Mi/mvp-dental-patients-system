import * as React from "react"
import { toast } from "sonner"
import { useRegisterSW } from "virtual:pwa-register/react"

/** Cada cuánto se pregunta al servidor si hay un build nuevo. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Registra el service worker que guarda la app para abrirla sin conexión
 * (`vite-plugin-pwa`, solo en el build de producción). Cuando hay un build
 * nuevo avisa con un toast en vez de recargar solo: una recarga automática
 * haría perder un formulario a medio llenar.
 */
export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // La app pasa días abierta sin navegar, y el navegador solo busca una
      // versión nueva al cargar la página.
      setInterval(() => {
        if (navigator.onLine) void registration.update()
      }, UPDATE_CHECK_MS)
    },
  })

  React.useEffect(() => {
    if (!needRefresh) return
    toast.info("Hay una nueva versión disponible.", {
      id: "app-update",
      duration: Infinity,
      closeButton: true,
      action: { label: "Actualizar", onClick: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, updateServiceWorker])
}
