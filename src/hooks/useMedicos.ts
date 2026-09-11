import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { userActions } from "@/actions"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/store/auth.store"
import { useUiStore } from "@/store/ui.store"
import type { Usuario } from "@/types/clinic"

/** Referencia estable para evitar recalcular memos en cada render. */
const NO_MEDICOS: Usuario[] = []

/** `GET /user/medicos` — médicos activos, visibles para cualquier usuario. */
export function useMedicos(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.users.medicos(),
    queryFn: userActions.listMedicos,
    enabled,
  })

  return {
    medicos: query.data ?? NO_MEDICOS,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Resuelve de qué médico son la agenda y los pacientes que se están viendo.
 *
 * - Un **médico** siempre trabaja sobre lo suyo: `medicoEmail` es `null` y las
 *   acciones usan las rutas propias (`/citas`, `/pacientes`), que el backend
 *   filtra por el correo del token.
 * - Un **asistente** elige médico (`agendaMedico` en el store de UI) y las
 *   acciones usan las rutas por médico (`/citas/medico/:correo`,
 *   `/pacientes?correo_medico=`). Mientras no haya uno elegido, `isReady` es
 *   `false` y las queries quedan deshabilitadas.
 */
export function useActiveMedico() {
  const usuario = useAuthStore((s) => s.usuario)
  const isAsistente = usuario?.tipo === "asistente"

  const selected = useUiStore((s) => s.agendaMedico)
  const setMedico = useUiStore((s) => s.setAgendaMedico)

  const { medicos, isLoading, error } = useMedicos(isAsistente)

  // Sin elección previa (o si el médico guardado ya no está activo) se cae al
  // primero de la lista para que la agenda nunca aparezca vacía sin motivo.
  React.useEffect(() => {
    if (!isAsistente || medicos.length === 0) return
    if (selected && medicos.some((m) => m.correo === selected)) return
    setMedico(medicos[0].correo)
  }, [isAsistente, medicos, selected, setMedico])

  const medicoEmail = isAsistente ? selected : null
  const medicoActivo = React.useMemo(() => {
    if (!isAsistente) return usuario ?? null
    return medicos.find((m) => m.correo === selected) ?? null
  }, [isAsistente, medicos, selected, usuario])

  return {
    isAsistente,
    medicos,
    /** Correo para las rutas por médico; `null` cuando es la agenda propia. */
    medicoEmail,
    /** Usuario cuya agenda se ve, para mostrar su nombre en la UI. */
    medicoActivo,
    setMedico,
    /** `false` mientras un asistente no tenga médico elegido. */
    isReady: !isAsistente || Boolean(selected),
    isLoadingMedicos: isLoading,
    medicosError: error,
  }
}
