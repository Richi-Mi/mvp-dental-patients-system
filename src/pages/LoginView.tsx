"use client"

import * as React from "react"
import { useSearchParams } from "react-router"
import { LogIn, UserPlus } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"

function errorMessage(error: unknown): string | null {
  if (!error) return null
  return error instanceof Error ? error.message : "Ocurrió un error inesperado"
}

export function LoginView() {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? "/agenda"

  const {
    login,
    isLoggingIn,
    loginError,
    register,
    isRegistering,
    registerError,
  } = useAuth({ redirectTo })

  const [correo, setCorreo] = React.useState("")
  const [password, setPassword] = React.useState("")

  const [nombre, setNombre] = React.useState("")
  const [nuevoCorreo, setNuevoCorreo] = React.useState("")
  const [nuevaPassword, setNuevaPassword] = React.useState("")
  const [registered, setRegistered] = React.useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login({ correo, password })
    } catch {
      // El error se muestra desde `loginError`.
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await register({
        nombre,
        correo: nuevoCorreo,
        password: nuevaPassword,
      })
      setRegistered(res.message)
      setCorreo(nuevoCorreo)
      setNombre("")
      setNuevoCorreo("")
      setNuevaPassword("")
    } catch {
      // El error se muestra desde `registerError`.
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
              Odontologia familiar
            </p>
            <p className="text-xs text-muted-foreground">Consultorio dental</p>
          </div>
        </div>

        <Card className="border-border/70">
          <Tabs defaultValue="login">
            <CardHeader>
              <CardTitle className="text-lg">Bienvenido</CardTitle>
              <CardDescription>
                Ingresa con tu cuenta para administrar la agenda del
                consultorio.
              </CardDescription>
              <TabsList className="mt-3 w-full">
                <TabsTrigger value="login" className="flex-1">
                  Iniciar sesión
                </TabsTrigger>
                <TabsTrigger value="registro" className="flex-1">
                  Crear cuenta
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login">
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
                      <FieldLabel htmlFor="login-password">
                        Contraseña
                      </FieldLabel>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </Field>

                    {registered && (
                      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {registered}
                      </p>
                    )}
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
              </TabsContent>

              <TabsContent value="registro">
                <form onSubmit={handleRegister}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="reg-nombre">Nombre</FieldLabel>
                      <Input
                        id="reg-nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="reg-correo">Correo</FieldLabel>
                      <Input
                        id="reg-correo"
                        type="email"
                        autoComplete="email"
                        value={nuevoCorreo}
                        onChange={(e) => setNuevoCorreo(e.target.value)}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="reg-password">Contraseña</FieldLabel>
                      <Input
                        id="reg-password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={nuevaPassword}
                        onChange={(e) => setNuevaPassword(e.target.value)}
                        required
                      />
                    </Field>

                    {registerError && (
                      <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {errorMessage(registerError)}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Las cuentas nuevas se crean como <b>asistente</b>. Un
                      médico puede cambiar el rol más adelante.
                    </p>

                    <Button type="submit" disabled={isRegistering}>
                      <UserPlus data-icon="inline-start" />
                      {isRegistering ? "Creando..." : "Crear cuenta"}
                    </Button>
                  </FieldGroup>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
