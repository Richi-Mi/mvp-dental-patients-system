"use client"

import * as React from "react"
import { useNavigate, useSearchParams } from "react-router"
import { ArrowLeft, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/custom/calendar"
import { usePatients } from "@/hooks/usePatients"
import { todayISO, validateBirthDate } from "@/lib/clinic-data"
import { MOBILE_CARD } from "@/lib/responsive"
import { cn } from "@/lib/utils"

const fieldControl =
  "flex h-9 w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:text-base"

const EMPTY = {
  name: "",
  birthDate: "",
  gender: "Femenino",
  phone: "",
  email: "",
  address: "",
  cp: "",
  notes: "",
}

/**
 * Alta de paciente. Con `?redirectTo=` vuelve a la pantalla que la invocó
 * (p. ej. el diálogo de nueva cita) añadiendo `paciente=<id>` para que quede
 * seleccionado.
 */
export function PatientFormView() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { createPatient, isCreating, createError } = usePatients()
  const [form, setForm] = React.useState(EMPTY)
  const [birthDateError, setBirthDateError] = React.useState<string | null>(
    null,
  )

  const redirectTo = searchParams.get("redirectTo")
  const today = todayISO()

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  function goBack() {
    navigate(redirectTo ?? "/pacientes")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || isCreating) return

    const dateError = validateBirthDate(form.birthDate, today)
    setBirthDateError(dateError)
    if (dateError) return

    let patient
    try {
      patient = await createPatient({ ...form, name: form.name.trim() })
    } catch {
      // El mensaje del backend (p. ej. un 422) se muestra vía `createError`.
      return
    }

    if (redirectTo) {
      const separator = redirectTo.includes("?") ? "&" : "?"
      navigate(`${redirectTo}${separator}paciente=${patient.id}`, {
        replace: true,
      })
      return
    }
    navigate(`/pacientes/${patient.id}`, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          onClick={goBack}
        >
          <ArrowLeft data-icon="inline-start" />
          {redirectTo ? "Volver a la cita" : "Volver a pacientes"}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nuevo paciente
        </h1>
      </div>

      <Card className={cn("max-w-2xl border-border/70", MOBILE_CARD)}>
        <CardHeader>
          <CardTitle className="text-base">Datos del expediente</CardTitle>
          <CardDescription>
            El paciente queda asignado a tu usuario. Solo el nombre es
            obligatorio; el resto se puede completar después.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="np-name">Nombre</FieldLabel>
                <Input
                  id="np-name"
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  autoFocus
                  required
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="np-birthdate">
                    Fecha de nacimiento
                  </FieldLabel>
                  <DatePicker
                    id="np-birthdate"
                    captionLayout="dropdown"
                    isDateDisabled={(date) => date > today}
                    placeholder="Selecciona la fecha"
                    clearable
                    value={form.birthDate}
                    onChange={(date) => {
                      set("birthDate")(date)
                      setBirthDateError(null)
                    }}
                    aria-invalid={birthDateError ? true : undefined}
                    aria-describedby={
                      birthDateError ? "np-birthdate-error" : undefined
                    }
                  />
                  {birthDateError && (
                    <p
                      id="np-birthdate-error"
                      className="text-xs text-rose-700"
                    >
                      {birthDateError}
                    </p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="np-gender">Sexo</FieldLabel>
                  <select
                    id="np-gender"
                    className={fieldControl}
                    value={form.gender}
                    onChange={(e) => set("gender")(e.target.value)}
                  >
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="np-phone">Teléfono</FieldLabel>
                  <Input
                    id="np-phone"
                    value={form.phone}
                    onChange={(e) => set("phone")(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="np-cp">Código postal</FieldLabel>
                  <Input
                    id="np-cp"
                    value={form.cp}
                    onChange={(e) => set("cp")(e.target.value)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="np-email">Correo</FieldLabel>
                <Input
                  id="np-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="np-address">Dirección</FieldLabel>
                <Input
                  id="np-address"
                  value={form.address}
                  onChange={(e) => set("address")(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="np-notes">Notas</FieldLabel>
                <Input
                  id="np-notes"
                  value={form.notes}
                  onChange={(e) => set("notes")(e.target.value)}
                />
              </Field>

              {createError && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createError instanceof Error
                    ? createError.message
                    : "No se pudo crear el paciente."}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 max-sm:*:flex-1">
                <Button type="button" variant="outline" onClick={goBack}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!form.name.trim() || isCreating}
                >
                  <UserPlus data-icon="inline-start" />
                  {isCreating ? "Creando..." : "Crear paciente"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
