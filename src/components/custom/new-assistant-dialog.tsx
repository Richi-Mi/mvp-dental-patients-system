"use client"

import * as React from "react"
import { UserPlus } from "lucide-react"

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
import { MOBILE_FAB } from "@/lib/responsive"

const EMPTY = { nombre: "", correo: "", password: "" }

export function NewAssistantDialog() {
  const { createAssistant, isCreating } = useUsers()
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY)
  const [error, setError] = React.useState<string | null>(null)

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const isValid =
    form.nombre.trim() && form.correo.trim() && form.password.length >= 8

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || isCreating) return
    try {
      await createAssistant({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        password: form.password,
      })
      setOpen(false)
    } catch (err) {
      // El correo duplicado llega como 409 desde el backend.
      setError(
        err instanceof Error ? err.message : "No se pudo crear el asistente.",
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setForm(EMPTY)
          setError(null)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" className={MOBILE_FAB}>
            <UserPlus data-icon="inline-start" />
            Nuevo asistente
          </Button>
        }
      />
      <ResponsiveDialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo asistente</DialogTitle>
            <DialogDescription>
              La cuenta se crea con rol <b>asistente</b> y queda activa de
              inmediato. Comparte la contraseña con la persona; solo tú puedes
              volver a cambiarla desde el servidor.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="na-nombre">Nombre</FieldLabel>
              <Input
                id="na-nombre"
                value={form.nombre}
                onChange={(e) => set("nombre")(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="na-correo">Correo</FieldLabel>
              <Input
                id="na-correo"
                type="email"
                autoComplete="off"
                placeholder="asistente@correo.com"
                value={form.correo}
                onChange={(e) => set("correo")(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="na-password">Contraseña</FieldLabel>
              <Input
                id="na-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres.
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
            <Button type="submit" disabled={!isValid || isCreating}>
              {isCreating ? "Creando..." : "Crear asistente"}
            </Button>
          </DialogFooter>
        </form>
      </ResponsiveDialogContent>
    </Dialog>
  )
}
