import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"

import { authActions } from "@/actions"
import type { LoginPayload, RegisterPayload } from "@/api/types"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/store/auth.store"

/**
 * Autenticación contra `/auth` y `/user`. El token vive en el store de
 * Zustand (persistido) y el interceptor de axios lo inyecta en cada request.
 */
export function useAuth(options: { redirectTo?: string } = {}) {
  const { redirectTo = "/agenda" } = options

  const token = useAuthStore((s) => s.token)
  const usuario = useAuthStore((s) => s.usuario)
  const setSession = useAuthStore((s) => s.setSession)
  const setUsuario = useAuthStore((s) => s.setUsuario)
  const clearSession = useAuthStore((s) => s.clearSession)

  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Revalida el usuario del token contra `GET /user`.
  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authActions.getCurrentUser,
    enabled: Boolean(token),
  })

  React.useEffect(() => {
    if (meQuery.data) setUsuario(meQuery.data)
  }, [meQuery.data, setUsuario])

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authActions.login(payload),
    onSuccess: ({ token: nextToken, usuario: nextUsuario }) => {
      queryClient.clear()
      setSession(nextToken, nextUsuario)
      navigate(redirectTo, { replace: true })
    },
  })

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authActions.register(payload),
  })

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { nombre?: string }) =>
      authActions.updateCurrentUser(payload),
    onSuccess: (nextUsuario) => {
      setUsuario(nextUsuario)
      queryClient.setQueryData(queryKeys.auth.me, nextUsuario)
    },
  })

  const logout = React.useCallback(() => {
    clearSession()
    queryClient.clear()
    navigate("/login", { replace: true })
  }, [clearSession, queryClient, navigate])

  return {
    usuario,
    token,
    isAuthenticated: Boolean(token),
    isMedico: usuario?.tipo === "medico",

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    logout,
    isLoadingSession: meQuery.isLoading,
  }
}
