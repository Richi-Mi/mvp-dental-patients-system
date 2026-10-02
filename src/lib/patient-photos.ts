/**
 * Reglas de las fotos de los pacientes, las mismas que aplica el backend
 * (`domain/fotos.ts`). Se revisan aquí para avisar antes de subir nada; el
 * backend las vuelve a revisar.
 */

/** Máximo de fotos por paciente, contando las que ya tiene. */
export const MAX_PATIENT_PHOTOS = 5

/** Tamaño máximo de cada archivo, en MB (el `"20m"` del backend: 1 MB = 1 048 576 bytes). */
export const MAX_PHOTO_MB = 20

const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024

/**
 * Formatos que acepta el backend (los que `Bun.Image` lee en Linux). Al
 * elegir una foto HEIC del iPhone con esta lista, Safari la convierte a JPEG.
 */
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/bmp"

/**
 * Por qué no se pueden subir `files` a un paciente que ya tiene `currentCount`
 * fotos, o `null` si sí se pueden. Mismos textos que el backend.
 */
export function photoSelectionError(
  currentCount: number,
  files: ReadonlyArray<Pick<File, "name" | "size">>,
): string | null {
  if (currentCount + files.length > MAX_PATIENT_PHOTOS) {
    if (currentCount === 0) {
      return `Puedes subir como máximo ${MAX_PATIENT_PHOTOS} imágenes.`
    }
    if (currentCount >= MAX_PATIENT_PHOTOS) {
      return `El paciente ya tiene ${MAX_PATIENT_PHOTOS} imágenes, el máximo permitido. Elimina alguna para subir otra.`
    }
    const remaining = MAX_PATIENT_PHOTOS - currentCount
    const images = currentCount === 1 ? "imagen" : "imágenes"
    return `El paciente ya tiene ${currentCount} ${images}: solo puedes subir ${remaining} más (máximo ${MAX_PATIENT_PHOTOS}).`
  }

  const tooBig = files.find((file) => file.size > MAX_PHOTO_BYTES)
  if (tooBig) return `"${tooBig.name}" pesa más de ${MAX_PHOTO_MB} MB.`

  return null
}
