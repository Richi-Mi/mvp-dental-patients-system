import * as React from "react"

import { useAjustes } from "@/hooks/useAjustes"
import { FONT_SIZE, fontSizeFor, normalizeFontSize } from "@/lib/font-size"
import { useAuthStore } from "@/store/auth.store"
import { usePreferencesStore } from "@/store/preferences.store"

/**
 * Tamaño de letra del usuario con sesión (pantalla Ajustes). Se guarda en el
 * servidor, así que es el mismo en todos sus dispositivos; `syncFontSize`
 * (montado en `ClinicApp`) lo aplica a la página desde la copia de este
 * dispositivo (`preferences.store`), que `useSyncFontSize` mantiene al día.
 */
export function useFontSize() {
  const correo = useAuthStore((s) => s.usuario?.correo ?? null)
  const fontSize = usePreferencesStore((s) => fontSizeFor(s.fontSizes, correo))
  const setStoredFontSize = usePreferencesStore((s) => s.setFontSize)
  const { updateAjustes, isUpdating } = useAjustes()

  return {
    fontSize,
    isDefault: fontSize === FONT_SIZE.default,
    isSaving: isUpdating,
    /**
     * Se aplica en el momento y se guarda en el servidor. Si no se pudo
     * guardar (p. ej. sin conexión) vuelve al tamaño anterior y rechaza.
     */
    setFontSize: async (percent: number) => {
      if (!correo) return
      const next = normalizeFontSize(percent)
      setStoredFontSize(correo, next)
      try {
        await updateAjustes({ fontSize: next })
      } catch (error) {
        setStoredFontSize(correo, fontSize)
        throw error
      }
    },
  }
}

/**
 * Copia en este dispositivo el tamaño de letra de los ajustes del servidor
 * (también el que se guardó desde otro dispositivo, al volver a cargarlos).
 * La copia existe porque se lee de forma sincrónica antes del primer
 * render, cuando la caché de consultas todavía no se recupera de IndexedDB: así
 * la letra no cambia de tamaño al abrir la app, y sin conexión se queda la
 * última conocida. Se monta una sola vez, en `AppLayout`.
 */
export function useSyncFontSize() {
  const correo = useAuthStore((s) => s.usuario?.correo ?? null)
  const { ajustes } = useAjustes()
  const fontSize = ajustes?.fontSize
  const setStoredFontSize = usePreferencesStore((s) => s.setFontSize)

  React.useEffect(() => {
    if (correo && fontSize !== undefined) setStoredFontSize(correo, fontSize)
  }, [correo, fontSize, setStoredFontSize])
}
