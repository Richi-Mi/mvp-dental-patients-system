import { createBrowserRouter, redirect, type LoaderFunctionArgs } from "react-router"

import { AppLayout } from "@/layouts/AppLayout"
import { AgendaView } from "@/pages/AgendaView"
import { DashboardView } from "@/pages/DashboardView"
import { ErrorView, NotFoundView } from "@/pages/ErrorView"
import { LoginView } from "@/pages/LoginView"
import { PatientDetailView, PatientsEmptyView } from "@/pages/PatientDetailView"
import { PatientsView } from "@/pages/PatientsView"
import { isAuthenticated } from "@/store/auth.store"

/** El token de Zustand se hidrata de `localStorage` de forma sincrónica. */
function requireAuth({ request }: LoaderFunctionArgs) {
  if (isAuthenticated()) return null
  const { pathname, search } = new URL(request.url)
  const redirectTo = encodeURIComponent(`${pathname}${search}`)
  return redirect(`/login?redirectTo=${redirectTo}`)
}

function redirectIfAuthenticated() {
  return isAuthenticated() ? redirect("/agenda") : null
}

export const router = createBrowserRouter([
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
      { path: "dashboard", Component: DashboardView },
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
])
