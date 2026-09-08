"use client"

import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

export function ErrorView() {
  const error = useRouteError()
  const navigate = useNavigate()

  const title = isRouteErrorResponse(error)
    ? `Error ${error.status}`
    : "Algo salió mal"
  const description = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "Ocurrió un error inesperado."

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Empty className="max-w-md rounded-xl border border-dashed">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/agenda", { replace: true })}
        >
          Volver a la agenda
        </Button>
      </Empty>
    </div>
  )
}

export function NotFoundView() {
  const navigate = useNavigate()
  return (
    <Empty className="rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyTitle>Página no encontrada</EmptyTitle>
        <EmptyDescription>
          La ruta que buscas no existe en la aplicación.
        </EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" size="sm" onClick={() => navigate("/agenda")}>
        Ir a la agenda
      </Button>
    </Empty>
  )
}
