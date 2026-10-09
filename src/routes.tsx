import { redirect, type LoaderFunctionArgs, type RouteObject } from "react-router"

import { RouteFallback } from "@/components/custom/route-fallback"
import { AppLayout } from "@/layouts/AppLayout"
import { AgendaView } from "@/pages/AgendaView"
import { ErrorView, NotFoundView } from "@/pages/ErrorView"
import { PatientDetailView, PatientsEmptyView } from "@/pages/PatientDetailView"
import { PatientFormView } from "@/pages/PatientFormView"
import { PatientsView } from "@/pages/PatientsView"
import { isAuthenticated, isMedico } from "@/store/auth.store"

// Pantallas que se cargan aparte (cada una en su propio chunk del build): no
// se visitan en cada sesión, así que no tienen por qué retrasar la primera
// carga de la agenda. El dashboard además arrastra la librería de gráficas.
// El loader de la ruta corre mientras se descarga el chunk, y el service
// worker los guarda todos, así que también abren sin conexión.
const lazyLogin = { Component: () => import("@/pages/LoginView").then((m) => m.LoginView) }
const lazyDashboard = {
  Component: () => import("@/pages/DashboardView").then((m) => m.DashboardView),
}
const lazyUsers = { Component: () => import("@/pages/UsersView").then((m) => m.UsersView) }
const lazySettings = {
  Component: () => import("@/pages/SettingsView").then((m) => m.SettingsView),
}

/** El token de Zustand se hidrata de `localStorage` de forma sincrónica. */
function requireAuth({ request }: LoaderFunctionArgs) {
  if (isAuthenticated()) return null
  const { pathname, search } = new URL(request.url)
  const redirectTo = encodeURIComponent(`${pathname}${search}`)
  return redirect(`/login?redirectTo=${redirectTo}`)
}

/** `/user/all` y `/user/admin/*` responden 403 si el usuario no es médico. */
function requireMedico() {
  return isMedico() ? null : redirect("/agenda")
}

function redirectIfAuthenticated() {
  return isAuthenticated() ? redirect("/agenda") : null
}

export const routes: RouteObject[] = [
  {
    path: "/login",
    loader: redirectIfAuthenticated,
    lazy: lazyLogin,
    ErrorBoundary: ErrorView,
    // Si se abre la app directo en una pantalla que se carga aparte, esto se
    // ve mientras llega su chunk (solo en esa primera carga).
    HydrateFallback: RouteFallback,
  },
  {
    path: "/",
    loader: requireAuth,
    Component: AppLayout,
    ErrorBoundary: ErrorView,
    HydrateFallback: RouteFallback,
    children: [
      { index: true, loader: () => redirect("/agenda") },
      { path: "agenda", Component: AgendaView },
      // Métricas del médico: un asistente no debe verlas.
      { path: "dashboard", loader: requireMedico, lazy: lazyDashboard },
      { path: "usuarios", loader: requireMedico, lazy: lazyUsers },
      // Cada usuario (médico o asistente) tiene sus propios ajustes.
      { path: "ajustes", lazy: lazySettings },
      // `nuevo` va fuera del layout de lista: es un formulario de página
      // completa al que se llega desde el diálogo de nueva cita.
      { path: "pacientes/nuevo", Component: PatientFormView },
      {
        path: "pacientes",
        Component: PatientsView,
        children: [
          { index: true, Component: PatientsEmptyView },
          { path: ":id", Component: PatientDetailView },
        ],
      },
      { path: "*", Component: NotFoundView },
    ],
  },
]
