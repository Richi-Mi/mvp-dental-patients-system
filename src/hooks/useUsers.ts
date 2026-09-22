import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { userActions } from "@/actions"
import { isNetworkError } from "@/api/client"
import type { RegisterPayload, UpdateUsuarioPayload } from "@/api/types"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/store/auth.store"
import type { Usuario } from "@/types/clinic"

/** Referencia estable para evitar recalcular memos en cada render. */
const NO_USERS: Usuario[] = []

function byNombre(a: Usuario, b: Usuario) {
  return a.nombre.localeCompare(b.nombre, "es")
}

/**
 * Staff del consultorio (`GET /user/all`, solo rol `medico`).
 *
 * El backend no guarda a qué médico pertenece cada asistente (la entidad
 * `Usuario` no tiene esa relación), así que `assistants` son todos los
 * usuarios con `tipo: "asistente"` del sistema.
 *
 * Tampoco existe un `DELETE /user/...`: dar de baja es `PUT /user/admin/:correo`
 * con `activo: false`, que bloquea el login (403) sin borrar el registro.
 */
export function useUsers() {
  const isMedico = useAuthStore((s) => s.usuario?.tipo === "medico")
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: userActions.listUsers,
    enabled: isMedico,
  })

  const users = listQuery.data ?? NO_USERS

  const assistants = React.useMemo(
    () => users.filter((u) => u.tipo === "asistente").sort(byNombre),
    [users],
  )

  const invalidate = React.useCallback(
    (correo?: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      if (correo) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(correo),
        })
      }
    },
    [queryClient],
  )

  // `POST /user/admin/register` exige `tipo` en el body (422 si falta), así
  // que el panel lo fija en "asistente".
  const createMutation = useMutation({
    mutationFn: (payload: RegisterPayload) =>
      userActions.registerStaff({ ...payload, tipo: "asistente" }),
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      correo,
      payload,
    }: {
      correo: string
      payload: UpdateUsuarioPayload
    }) => userActions.updateUser(correo, payload),
    onSuccess: (usuario) => invalidate(usuario.correo),
  })

  return {
    users,
    assistants,
    isMedico,

    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: isNetworkError(listQuery.error) ? undefined : listQuery.error,
    refetch: listQuery.refetch,

    createAssistant: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateUser: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    /** Baja lógica: el usuario deja de poder iniciar sesión. */
    deactivateUser: (correo: string) =>
      updateMutation.mutateAsync({ correo, payload: { activo: false } }),
    reactivateUser: (correo: string) =>
      updateMutation.mutateAsync({ correo, payload: { activo: true } }),
  }
}
