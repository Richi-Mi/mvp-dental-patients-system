import { create } from "zustand"
import { persist } from "zustand/middleware"

export type PreferencesState = {
  /**
   * Tamaño de letra (porcentaje del tamaño del navegador) por correo de
   * usuario: cada quien tiene el suyo en este dispositivo. Se lee siempre a
   * través de `fontSizeFor` (`lib/font-size.ts`), que lo normaliza.
   */
  fontSizes: Record<string, number>
  setFontSize: (correo: string, percent: number) => void
  resetFontSize: (correo: string) => void
}

export const PREFERENCES_STORAGE_KEY = "dentalcare.preferencias"

/**
 * Preferencias de pantalla del dispositivo (pantalla Ajustes). Se persisten en
 * `localStorage` de forma sincrónica, así que se aplican antes del primer
 * render. No se borran al cerrar sesión: no son datos clínicos.
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      fontSizes: {},
      setFontSize: (correo, percent) =>
        set((state) => ({
          fontSizes: { ...state.fontSizes, [correo]: percent },
        })),
      resetFontSize: (correo) =>
        set((state) => {
          const fontSizes = { ...state.fontSizes }
          delete fontSizes[correo]
          return { fontSizes }
        }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      partialize: (state) => ({ fontSizes: state.fontSizes }),
    },
  ),
)
