/**
 * Clases compartidas del sistema responsive (ver el bloque "Sistema
 * responsive" en `index.css`). Todo va con variantes `max-*`, así que en
 * escritorio no cambia nada.
 */

/**
 * En teléfono el botón de la acción principal de la pantalla se vuelve un FAB
 * extendido fijo sobre la navegación inferior (Material). En tablet y
 * escritorio sigue en el encabezado.
 */
export const MOBILE_FAB =
  "max-sm:fixed max-sm:right-4 max-sm:bottom-20 max-sm:z-30 max-sm:h-14 max-sm:gap-2 max-sm:rounded-2xl max-sm:px-5 max-sm:text-base max-sm:shadow-lg"

/** Tarjetas con márgenes internos de 16px en teléfono en vez de 24px. */
export const MOBILE_CARD = "max-sm:[--card-spacing:--spacing(4)]"
