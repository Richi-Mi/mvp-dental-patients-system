"use client"

import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { RouterProvider } from "react-router"

import { Toaster } from "@/components/ui/sonner"
import { useAppUpdate } from "@/hooks/useAppUpdate"
import { useHasBottomNav } from "@/hooks/useMediaQuery"
import { syncFontSize } from "@/lib/font-size"
import { queryClient } from "@/lib/query-client"
import { clearCacheOnSessionEnd, persistOptions, queryPersister } from "@/lib/query-persister"
import { router } from "@/router"

/**
 * Separación de los toasts para que no tapen la navegación inferior (`h-16`).
 * En rem, como la barra, para que sigan alineados con el tamaño de letra de
 * Ajustes (80px con la letra normal).
 */
const ABOVE_BOTTOM_NAV = { bottom: "5rem" }
/** En teléfono además quedan por encima del FAB (ver `MOBILE_FAB`; 152px). */
const ABOVE_MOBILE_FAB = { bottom: "9.5rem" }

clearCacheOnSessionEnd(queryClient, queryPersister)
// Antes del primer render, para que la letra no cambie de tamaño al cargar.
syncFontSize()

export function ClinicApp() {
    const hasBottomNav = useHasBottomNav()
    useAppUpdate()

    return (
        // Antes de lanzar las consultas recupera la caché guardada: sin
        // conexión, la pantalla se llena con lo último que se cargó.
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <RouterProvider router={router} />
            <Toaster
                position="bottom-right"
                richColors
                offset={hasBottomNav ? ABOVE_BOTTOM_NAV : undefined}
                mobileOffset={ABOVE_MOBILE_FAB}
            />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </PersistQueryClientProvider>
    )
}
