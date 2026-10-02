import * as React from "react"
import { useSearchParams } from "react-router"

/**
 * Estado del diálogo de cita, que vive en la URL para poder volver a él
 * después de crear un paciente en otra ruta:
 *
 * - `?cita=nueva` -> alta (el borrador está en `ui.store`).
 * - `?cita=<id>` -> edición de esa cita (el formulario parte de sus datos).
 *
 * Lo usan el propio diálogo, el botón "Editar" de cada cita y el atajo de
 * teclado de la agenda (Shift + ↑).
 */
export function useNewAppointmentDialog() {
    const [searchParams, setSearchParams] = useSearchParams()
    const cita = searchParams.get("cita")
    const open = cita !== null
    /** Id de la cita que se está editando; `null` si es un alta. */
    const editingId = cita === null || cita === "nueva" ? null : cita

    const setCita = React.useCallback(
        (value: string | null) => {
            setSearchParams(
                (prev) => {
                    const params = new URLSearchParams(prev)
                    if (value) params.set("cita", value)
                    else {
                        params.delete("cita")
                        params.delete("paciente")
                    }
                    return params
                },
                { replace: true },
            )
        },
        [setSearchParams],
    )

    const setOpen = React.useCallback(
        (next: boolean) => setCita(next ? "nueva" : null),
        [setCita],
    )

    /** Abre el diálogo sobre una cita existente. */
    const editAppointment = React.useCallback(
        (id: string) => setCita(id),
        [setCita],
    )

    return { open, editingId, setOpen, editAppointment }
}
