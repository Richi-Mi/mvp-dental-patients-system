import { useAuthStore } from "@/store/auth.store"
import { usePreferencesStore } from "@/store/preferences.store"

/**
 * Tamaño de letra de la app (pantalla Ajustes), en porcentaje del tamaño del
 * navegador. Son enteros para que el slider no arrastre errores de punto
 * flotante. En teléfono no baja de 100 %: iOS hace zoom al enfocar un campo de
 * menos de 16px (ver el bloque `html` de `index.css`).
 */
export const FONT_SIZE = {
  min: 90,
  phoneMin: 100,
  max: 130,
  step: 5,
  default: 100,
} as const

/** Variable CSS que lee `html { font-size }` en `index.css`. */
const CSS_VARIABLE = "--app-font-size"

/**
 * Lleva el valor al rango y lo redondea al paso. Lo guardado en
 * `localStorage` puede venir corrupto: cualquier cosa que no sea un número
 * vale el tamaño por defecto.
 */
export function normalizeFontSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return FONT_SIZE.default
  }
  const stepped = Math.round(value / FONT_SIZE.step) * FONT_SIZE.step
  return Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, stepped))
}

/** Tamaño del usuario; sin sesión (login) o sin preferencia, el normal. */
export function fontSizeFor(
  fontSizes: Record<string, unknown> | null | undefined,
  correo: string | null | undefined,
): number {
  if (!correo) return FONT_SIZE.default
  return normalizeFontSize(fontSizes?.[correo])
}

type StyleTarget = {
  style: Pick<CSSStyleDeclaration, "setProperty" | "removeProperty">
}

/** Con el tamaño normal quita la variable y manda el tamaño del navegador. */
export function applyFontSize(
  percent: number,
  root: StyleTarget = document.documentElement,
) {
  if (percent === FONT_SIZE.default) root.style.removeProperty(CSS_VARIABLE)
  else root.style.setProperty(CSS_VARIABLE, `${percent}%`)
}

/**
 * Aplica el tamaño de letra del usuario con sesión y lo vuelve a aplicar al
 * iniciar o cerrar sesión y al mover el slider. Se llama una vez, antes del
 * primer render, para que no se vea un salto de tamaño. Devuelve la función
 * para dejar de escuchar.
 */
export function syncFontSize() {
  const apply = () =>
    applyFontSize(
      fontSizeFor(
        usePreferencesStore.getState().fontSizes,
        useAuthStore.getState().usuario?.correo,
      ),
    )

  apply()
  const stopAuth = useAuthStore.subscribe(apply)
  const stopPreferences = usePreferencesStore.subscribe(apply)
  return () => {
    stopAuth()
    stopPreferences()
  }
}
