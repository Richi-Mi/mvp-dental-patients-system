"use client"

import * as React from "react"
import { NavLink, Outlet, useNavigate } from "react-router"
import { CalendarDays, LayoutDashboard, LogOut, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pacientes", label: "Pacientes", icon: Users },
] as const

export function AppLayout() {
  const { usuario, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  // El interceptor de axios limpia la sesión ante un 401; sin esto la app
  // se quedaría en una pantalla vacía hasta la siguiente navegación.
  React.useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true })
  }, [isAuthenticated, navigate])

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
      <aside className="flex flex-col gap-6 border-b border-border bg-sidebar px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-primary">
            <img
              src="/icon_local.png"
              alt="DentalCare"
              className="size-full object-cover"
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">
              Odontologia familiar
            </p>
            <p className="text-xs text-muted-foreground">Consultorio dental</p>
          </div>
        </div>

        <nav className="flex w-full flex-row gap-1 lg:flex-col">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex w-full items-center justify-start gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:h-9",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden flex-col gap-2 lg:flex">
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground">
              {usuario?.nombre ?? "Sesión activa"}
            </p>
            <p className="capitalize">{usuario?.tipo ?? ""}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut data-icon="inline-start" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
