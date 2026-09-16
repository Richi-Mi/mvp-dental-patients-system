"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "react-router"

import { Toaster } from "@/components/ui/sonner"
import { useHasBottomNav } from "@/hooks/useMediaQuery"
import { queryClient } from "@/lib/query-client"
import { router } from "@/router"

/** Separación de los toasts para que no tapen la navegación inferior (64px). */
const ABOVE_BOTTOM_NAV = { bottom: 80 }
/** En teléfono además quedan por encima del FAB (ver `MOBILE_FAB`). */
const ABOVE_MOBILE_FAB = { bottom: 152 }

export function ClinicApp() {
    const hasBottomNav = useHasBottomNav()

    return (
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster
                position="bottom-right"
                richColors
                offset={hasBottomNav ? ABOVE_BOTTOM_NAV : undefined}
                mobileOffset={ABOVE_MOBILE_FAB}
            />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    )
}
