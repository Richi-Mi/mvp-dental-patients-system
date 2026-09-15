"use client"

import { Loader2, RotateCcw, ShieldAlert, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { EditAssistantDialog } from "@/components/custom/edit-assistant-dialog"
import { NewAssistantDialog } from "@/components/custom/new-assistant-dialog"
import { useUsers } from "@/hooks/useUsers"
import { cn } from "@/lib/utils"
import type { Usuario } from "@/types/clinic"

export function UsersView() {
  const {
    assistants,
    isMedico,
    isLoading,
    isFetching,
    error,
    deactivateUser,
    reactivateUser,
    isUpdating,
    updateError,
  } = useUsers()

  // El loader de la ruta ya bloquea el acceso; esto cubre el caso de que el
  // rol cambie con la vista abierta.
  if (!isMedico) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <ShieldAlert className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Solo un usuario de tipo médico puede administrar el staff.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Asistentes
          </h1>
          <p className="text-sm text-muted-foreground">
            Asistentes con acceso al consultorio.
          </p>
        </div>
        <NewAssistantDialog />
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error instanceof Error
            ? error.message
            : "No se pudieron cargar los usuarios."}
        </p>
      )}

      {updateError && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {updateError instanceof Error
            ? updateError.message
            : "No se pudo actualizar el asistente."}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando usuarios...
        </div>
      ) : assistants.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-10 text-center text-sm text-muted-foreground">
          Aún no hay asistentes registrados.
        </p>
      ) : (
        <div
          className={cn(
            "overflow-x-auto rounded-xl border border-border/70 transition-opacity",
            isFetching && "opacity-60",
          )}
        >
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assistants.map((usuario) => (
                <AssistantRow
                  key={usuario.correo}
                  usuario={usuario}
                  isUpdating={isUpdating}
                  onDeactivate={deactivateUser}
                  onReactivate={reactivateUser}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Las cuentas nunca se borran de la base de datos: al eliminar un
        asistente se desactiva su acceso y su historial se conserva.
      </p>
    </div>
  )
}

function AssistantRow({
  usuario,
  isUpdating,
  onDeactivate,
  onReactivate,
}: {
  usuario: Usuario
  isUpdating: boolean
  onDeactivate: (correo: string) => Promise<Usuario>
  onReactivate: (correo: string) => Promise<Usuario>
}) {
  return (
    <TableRow className={cn(!usuario.activo && "opacity-60")}>
      <TableCell className="font-medium text-foreground">
        {usuario.nombre}
      </TableCell>
      <TableCell className="text-muted-foreground">{usuario.correo}</TableCell>
      <TableCell>
        <Badge variant={usuario.activo ? "secondary" : "destructive"}>
          {usuario.activo ? "Activo" : "Inactivo"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <EditAssistantDialog usuario={usuario} />
          {usuario.activo ? (
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isUpdating}
                  className="text-rose-600 hover:text-rose-700"
                >
                  <Trash2 data-icon="inline-start" />
                  Eliminar
                </Button>
              }
              title={`¿Eliminar a ${usuario.nombre}?`}
              description="Perderá el acceso al sistema; su historial se conserva y puedes reactivarlo después."
              confirmLabel="Eliminar"
              successMessage={`${usuario.nombre} ya no tiene acceso al sistema.`}
              cancelMessage="Se canceló la eliminación del asistente."
              onConfirm={() => onDeactivate(usuario.correo)}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                // El error se muestra desde `updateError`.
                onReactivate(usuario.correo).catch(() => {})
              }}
            >
              <RotateCcw data-icon="inline-start" />
              Reactivar
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
