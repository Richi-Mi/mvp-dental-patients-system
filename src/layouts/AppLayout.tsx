"use client"

import * as React from "react"
import { NavLink, Outlet, useNavigate } from "react-router"
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserCog,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useAuth } from "@/hooks/useAuth"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { cn } from "@/lib/utils"
import type { Usuario } from "@/types/clinic"

const NAV = [
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  // Dashboard y panel de staff solo existen para el rol `medico` (ver `requireMedico`).
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, medicoOnly: true },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/usuarios", label: "Asistentes", icon: UserCog, medicoOnly: true },
  { to: "/ajustes", label: "Ajustes", icon: Settings, medicoOnly: true },
] as const

type NavItem = (typeof NAV)[number]

const TITULO_POR_GENERO = {
  femenino: "Cirujana Dentista",
  masculino: "Cirujano Dentista",
} as const

// El género solo sirve para elegir el título del médico; los asistentes y los
// médicos sin género registrado muestran el tipo.
function tituloUsuario(usuario: Usuario) {
  return usuario.tipo === "medico" && usuario.genero
    ? TITULO_POR_GENERO[usuario.genero]
    : usuario.tipo
}

/**
 * Escritorio (≥ lg): sidebar fija. Teléfono y tablet: barra superior con un
 * drawer (el mismo contenido que la sidebar) y navegación inferior.
 */
export function AppLayout() {
  const { usuario, isAuthenticated, isMedico, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Se monta una sola vez para toda la app: sincroniza los cambios sin
  // conexión sin importar en qué pantalla esté el usuario cuando vuelve el
  // internet (ver `useOfflineSync`; el botón de la agenda reutiliza el mismo
  // hook solo para mostrar su estado).
  useOfflineSync()

  const nav = NAV.filter((item) => !("medicoOnly" in item) || isMedico)

  // El interceptor de axios limpia la sesión ante un 401; sin esto la app
  // se quedaría en una pantalla vacía hasta la siguiente navegación.
  React.useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true })
  }, [isAuthenticated, navigate])

  const sidebar = (onNavigate?: () => void) => (
    <SidebarContent
      nav={nav}
      usuario={usuario}
      onLogout={logout}
      onNavigate={onNavigate}
    />
  )

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-border bg-sidebar px-4 py-5 lg:flex">
        {sidebar()}
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-sidebar/95 px-2 backdrop-blur-sm sm:px-4 lg:hidden">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="gap-6 bg-sidebar px-4 py-5">
            <SheetTitle className="sr-only">Menú</SheetTitle>
            {sidebar(() => setDrawerOpen(false))}
          </SheetContent>
        </Sheet>
        <img
          src="/icon_local.png"
          alt=""
          className="size-9 shrink-0 object-contain"
        />
        <p className="truncate text-base font-semibold text-foreground">
          Odontologia Familiar GC
        </p>
      </header>

      <main className="flex-1 px-4 py-6 max-lg:pb-24 max-sm:pb-40 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      <BottomNav nav={nav} />
    </div>
  )
}

function SidebarContent({
  nav,
  usuario,
  onLogout,
  onNavigate,
}: {
  nav: readonly NavItem[]
  usuario: Usuario | null
  onLogout: () => void
  /** El drawer se cierra al elegir una sección. */
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <img
          src="/icon_local.png"
          alt="Odontologia Familiar"
          className="size-24 object-contain max-lg:size-16"
        />
        <div className="leading-tight">
          <p className="text-base font-semibold text-foreground">
            Odontologia Familiar GC
          </p>
          <p className="text-sm text-muted-foreground">Consultorio Dental</p>
        </div>
      </div>

      <nav className="flex w-full flex-col gap-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex h-9 w-full items-center justify-start gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors max-lg:h-12 max-lg:gap-3 max-lg:rounded-full max-lg:px-4 max-lg:text-base",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted",
              )
            }
          >
            <item.icon className="size-4 max-lg:size-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground max-lg:text-sm">
          <p className="truncate font-medium text-foreground">
            {usuario?.nombre ?? "Sesión activa"}
          </p>
          <p className="capitalize">{usuario ? tituloUsuario(usuario) : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut data-icon="inline-start" />
          Cerrar sesión
        </Button>
      </div>
    </>
  )
}

/** Barra de navegación inferior de Material para teléfono y tablet. */
function BottomNav({ nav }: { nav: readonly NavItem[] }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur-sm lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {nav.map((item) => (
          <li key={item.to} className="min-w-0 flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-foreground/70",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      // `max-w-full`: con 5 pestañas y letra grande (Ajustes) no se sale de la suya.
                      "flex h-8 w-14 max-w-full items-center justify-center rounded-full transition-colors",
                      isActive ? "bg-primary/10" : "group-hover:bg-muted",
                    )}
                  >
                    <item.icon className="size-5" />
                  </span>
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
