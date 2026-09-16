"use client"

import * as React from "react"
import { useSearchParams } from "react-router"
import { LogIn } from "lucide-react"

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
import { useAuth } from "@/hooks/useAuth"
import { MOBILE_CARD } from "@/lib/responsive"
import { cn } from "@/lib/utils"

function errorMessage(error: unknown): string | null {
  if (!error) return null
  return error instanceof Error ? error.message : "Ocurrió un error inesperado"
}

export function LoginView() {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? "/agenda"

  const { login, isLoggingIn, loginError } = useAuth({ redirectTo })

  const [correo, setCorreo] = React.useState("")
  const [password, setPassword] = React.useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login({ correo, password })
    } catch {
      // El error se muestra desde `loginError`.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-primary">
            <img
              src="/icon_local.png"
              alt="DentalCare"
              className="size-full object-cover"
            />
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-foreground">
              Odontologia familiar GC
            </p>
            <p className="text-xs text-muted-foreground">Consultorio dental</p>
          </div>
        </div>

        <Card className={cn("border-border/70", MOBILE_CARD)}>
          <CardHeader>
            <CardTitle className="text-lg">Bienvenido</CardTitle>
            <CardDescription>
              Ingresa con tu cuenta para administrar la agenda del consultorio.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="login-correo">Correo</FieldLabel>
                  <Input
                    id="login-correo"
                    type="email"
                    autoComplete="email"
                    placeholder="medico@correo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>

                {loginError && (
                  <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {errorMessage(loginError)}
                  </p>
                )}

                <Button type="submit" disabled={isLoggingIn}>
                  <LogIn data-icon="inline-start" />
                  {isLoggingIn ? "Entrando..." : "Entrar"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
