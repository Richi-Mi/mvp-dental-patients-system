import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Usuario } from "@/types/clinic"

export type AuthState = {
  token: string | null
  usuario: Usuario | null
  setSession: (token: string, usuario: Usuario) => void
  setUsuario: (usuario: Usuario) => void
  clearSession: () => void
}

export const AUTH_STORAGE_KEY = "dentalcare.auth"

/**
 * Sesión del usuario. Se persiste en `localStorage` (sincrónico), por lo que
 * los loaders del router pueden leerla con `useAuthStore.getState()` antes
 * de que React monte.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      setSession: (token, usuario) => set({ token, usuario }),
      setUsuario: (usuario) => set({ usuario }),
      clearSession: () => set({ token: null, usuario: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
    },
  ),
)

export const isAuthenticated = () => Boolean(useAuthStore.getState().token)
