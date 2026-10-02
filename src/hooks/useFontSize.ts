import { FONT_SIZE, fontSizeFor, normalizeFontSize } from "@/lib/font-size"
import { useAuthStore } from "@/store/auth.store"
import { usePreferencesStore } from "@/store/preferences.store"

/**
 * Tamaño de letra del usuario con sesión en este dispositivo (pantalla
 * Ajustes). `syncFontSize` (montado en `ClinicApp`) lo aplica a la página.
 */
export function useFontSize() {
  const correo = useAuthStore((s) => s.usuario?.correo ?? null)
  const fontSize = usePreferencesStore((s) => fontSizeFor(s.fontSizes, correo))
  const setStoredFontSize = usePreferencesStore((s) => s.setFontSize)
  const resetStoredFontSize = usePreferencesStore((s) => s.resetFontSize)

  return {
    fontSize,
    isDefault: fontSize === FONT_SIZE.default,
    setFontSize: (percent: number) => {
      if (correo) setStoredFontSize(correo, normalizeFontSize(percent))
    },
    resetFontSize: () => {
      if (correo) resetStoredFontSize(correo)
    },
  }
}
