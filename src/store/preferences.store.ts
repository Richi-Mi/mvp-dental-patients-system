import { create } from "zustand"
import { persist } from "zustand/middleware"

export type PreferencesState = {
  /**
   * Tamaño de letra (porcentaje del tamaño del navegador) por correo de
   * usuario. Es la copia en este dispositivo de lo que cada quien guardó en el
   * servidor (`useSyncFontSize`). Se lee siempre a través de `fontSizeFor`
   * (`lib/font-size.ts`), que lo normaliza.
   */
  fontSizes: Record<string, number>
  setFontSize: (correo: string, percent: number) => void
}

export const PREFERENCES_STORAGE_KEY = "dentalcare.preferencias"

/**
 * Copia local de las preferencias de pantalla (pantalla Ajustes; las guarda el
 * servidor). Se persisten en `localStorage` de forma sincrónica, así que se
 * aplican antes del primer render. No se borran al cerrar sesión: no son datos
 * clínicos.
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      fontSizes: {},
      setFontSize: (correo, percent) =>
        set((state) =>
          state.fontSizes[correo] === percent
            ? state
            : { fontSizes: { ...state.fontSizes, [correo]: percent } },
        ),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      partialize: (state) => ({ fontSizes: state.fontSizes }),
    },
  ),
)
