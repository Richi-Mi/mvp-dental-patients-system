import * as React from "react"

/** `true` mientras la media query se cumpla; se actualiza al redimensionar. */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    [query],
  )

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Teléfono: por debajo del breakpoint `sm` de Tailwind (640px). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 639px)")
}

/**
 * Teléfono o tablet: por debajo de `lg` (1024px), donde la sidebar se cambia
 * por la barra superior y la navegación inferior.
 */
export function useHasBottomNav(): boolean {
  return useMediaQuery("(max-width: 1023px)")
}
