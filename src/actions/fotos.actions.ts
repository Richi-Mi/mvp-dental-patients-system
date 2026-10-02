import { api } from "@/api/client"
import { ENDPOINTS } from "@/api/endpoints"
import type { FotoDTO } from "@/api/types"
import { toPatientPhoto } from "@/lib/mappers"
import type { PatientPhoto } from "@/types/clinic"

/** Subir varias fotos desde el celular tarda más que los 20 s del cliente. */
const UPLOAD_TIMEOUT = 3 * 60_000

/** `GET /pacientes/:id/fotos` — en orden de carga. */
export async function listPhotos(patientId: number): Promise<PatientPhoto[]> {
  const { data } = await api.get<FotoDTO[]>(ENDPOINTS.pacientes.fotos(patientId))
  return data.map(toPatientPhoto)
}

/**
 * `POST /pacientes/:id/fotos` — multipart, un campo `fotos` por archivo. El
 * backend las convierte a WebP. Es todo o nada: si una no es una imagen
 * válida, o si el paciente pasaría de 5 fotos, responde 400 y no guarda
 * ninguna.
 */
export async function uploadPhotos(
  patientId: number,
  files: File[],
): Promise<PatientPhoto[]> {
  const body = new FormData()
  for (const file of files) body.append("fotos", file)

  const { data } = await api.post<FotoDTO[]>(
    ENDPOINTS.pacientes.fotos(patientId),
    body,
    {
      // Con el `Content-Type: application/json` por defecto del cliente,
      // Axios convertiría el FormData a JSON. Con este lo envía como
      // multipart y el navegador pone el `boundary`.
      headers: { "Content-Type": "multipart/form-data" },
      timeout: UPLOAD_TIMEOUT,
    },
  )
  return data.map(toPatientPhoto)
}

/** `DELETE /pacientes/:id/fotos/:nombre` — borra la foto y su archivo. */
export async function deletePhoto(
  patientId: number,
  name: string,
): Promise<PatientPhoto> {
  const { data } = await api.delete<FotoDTO>(
    ENDPOINTS.pacientes.foto(patientId, name),
  )
  return toPatientPhoto(data)
}

/**
 * Descarga la imagen de una foto (`photo.url`). Exige el header `token`, por
 * eso no puede ir directo en un `<img src>`.
 */
export async function getPhotoFile(url: string): Promise<Blob> {
  const { data } = await api.get<Blob>(url, { responseType: "blob" })
  return data
}
