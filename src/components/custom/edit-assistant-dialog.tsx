"use client"

import * as React from "react"
import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ResponsiveDialogContent } from "@/components/custom/responsive-dialog"
import { useUsers } from "@/hooks/useUsers"
import type { Usuario } from "@/types/clinic"

const fieldControl =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:text-base"

export function EditAssistantDialog({ usuario }: { usuario: Usuario }) {
  const { updateUser, isUpdating } = useUsers()
  const [open, setOpen] = React.useState(false)
  const [nombre, setNombre] = React.useState(usuario.nombre)
  const [activo, setActivo] = React.useState(usuario.activo)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || isUpdating) return
    try {
      await updateUser({
        correo: usuario.correo,
        payload: { nombre: nombre.trim(), activo },
      })
      setOpen(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el asistente.",
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Al abrir se recarga el formulario con los datos vigentes.
        if (next) {
          setNombre(usuario.nombre)
          setActivo(usuario.activo)
          setError(null)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Pencil data-icon="inline-start" />
            Editar
          </Button>
        }
      />
      <ResponsiveDialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar asistente</DialogTitle>
            <DialogDescription>
              El correo es el identificador de la cuenta y no se puede cambiar.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="ea-correo">Correo</FieldLabel>
              <Input id="ea-correo" value={usuario.correo} disabled readOnly />
            </Field>
            <Field>
              <FieldLabel htmlFor="ea-nombre">Nombre</FieldLabel>
              <Input
                id="ea-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ea-activo">Estado</FieldLabel>
              <select
                id="ea-activo"
                className={fieldControl}
                value={activo ? "activo" : "inactivo"}
                onChange={(e) => setActivo(e.target.value === "activo")}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Un asistente inactivo conserva su historial pero no puede
                iniciar sesión.
              </p>
            </Field>

            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
          </FieldGroup>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={!nombre.trim() || isUpdating}>
              {isUpdating ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </ResponsiveDialogContent>
    </Dialog>
  )
}
