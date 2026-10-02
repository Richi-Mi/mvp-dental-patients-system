import { redirect, type LoaderFunctionArgs, type RouteObject } from "react-router"

import { AppLayout } from "@/layouts/AppLayout"
import { AgendaView } from "@/pages/AgendaView"
import { DashboardView } from "@/pages/DashboardView"
import { ErrorView, NotFoundView } from "@/pages/ErrorView"
import { LoginView } from "@/pages/LoginView"
import { PatientDetailView, PatientsEmptyView } from "@/pages/PatientDetailView"
import { PatientFormView } from "@/pages/PatientFormView"
import { PatientsView } from "@/pages/PatientsView"
import { SettingsView } from "@/pages/SettingsView"
import { UsersView } from "@/pages/UsersView"
import { isAuthenticated, isMedico } from "@/store/auth.store"

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
    Component: LoginView,
    ErrorBoundary: ErrorView,
  },
  {
    path: "/",
    loader: requireAuth,
    Component: AppLayout,
    ErrorBoundary: ErrorView,
    children: [
      { index: true, loader: () => redirect("/agenda") },
      { path: "agenda", Component: AgendaView },
      // Métricas del médico: un asistente no debe verlas.
      { path: "dashboard", loader: requireMedico, Component: DashboardView },
      { path: "usuarios", loader: requireMedico, Component: UsersView },
      // Por ahora los ajustes son solo del médico.
      { path: "ajustes", loader: requireMedico, Component: SettingsView },
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
