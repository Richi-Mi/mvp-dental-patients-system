import * as React from "react"
import { useSearchParams } from "react-router"

/**
 * Estado del diálogo de nueva cita, que vive en la URL (`?cita=nueva`) para
 * poder volver a él después de crear un paciente en otra ruta. Lo usan el
 * propio diálogo y el atajo de teclado de la agenda (Shift + ↑).
 */
export function useNewAppointmentDialog() {
    const [searchParams, setSearchParams] = useSearchParams()
    const open = searchParams.get("cita") === "nueva"

    const setOpen = React.useCallback(
        (next: boolean) => {
            setSearchParams(
                (prev) => {
                    const params = new URLSearchParams(prev)
                    if (next) params.set("cita", "nueva")
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

    return { open, setOpen }
}
