import { describe, expect, test } from "bun:test"
import { QueryClient, dehydrate } from "@tanstack/react-query"
import type { Persister } from "@tanstack/react-query-persist-client"

import { queryClient as appQueryClient } from "@/lib/query-client"
import { clearCacheOnSessionEnd, persistOptions } from "@/lib/query-persister"
import { useAuthStore } from "@/store/auth.store"
import type { Usuario } from "@/types/clinic"

function fakePersister() {
  let removed = 0
  const persister: Persister = {
    persistClient: async () => {},
    restoreClient: async () => undefined,
    removeClient: async () => {
      removed += 1
    },
  }
  return { persister, removed: () => removed }
}

const usuario = { correo: "medico@clinica.mx", nombre: "Médico", tipo: "medico" } as Usuario

describe("clearCacheOnSessionEnd", () => {
  test("al cerrar sesión borra la caché en memoria y la guardada", () => {
    const queryClient = new QueryClient()
    const { persister, removed } = fakePersister()
    useAuthStore.getState().setSession("token", usuario)
    const stop = clearCacheOnSessionEnd(queryClient, persister)

    queryClient.setQueryData(["pacientes", "list", "propio"], [{ id: 1 }])
    useAuthStore.getState().clearSession()

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(removed()).toBe(1)
    stop()
  })

  test("no borra nada si la sesión sigue abierta", () => {
    const queryClient = new QueryClient()
    const { persister, removed } = fakePersister()
    useAuthStore.getState().setSession("token", usuario)
    const stop = clearCacheOnSessionEnd(queryClient, persister)

    queryClient.setQueryData(["pacientes", "list", "propio"], [{ id: 1 }])
    useAuthStore.getState().setUsuario({ ...usuario, nombre: "Otro nombre" })

    expect(queryClient.getQueryCache().getAll()).toHaveLength(1)
    expect(removed()).toBe(0)
    stop()
    useAuthStore.getState().clearSession()
  })
})

test("no guarda las consultas marcadas con `meta: { persist: false }`", async () => {
  // Arrange
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ["pacientes", "list", "propio"],
    queryFn: async () => [{ id: 1 }],
  })
  await queryClient.prefetchQuery({
    queryKey: ["fotos", "file", "/pacientes/1/fotos/foto.webp"],
    queryFn: async () => new Blob(["imagen"]),
    meta: { persist: false },
  })

  // Act
  const { queries } = dehydrate(queryClient, persistOptions.dehydrateOptions)

  // Assert
  expect(queries.map((query) => query.queryKey)).toEqual([
    ["pacientes", "list", "propio"],
  ])
})

test("la caché en memoria dura al menos lo que la guardada", () => {
  // Con un `gcTime` menor, las consultas se borrarían de IndexedDB antes de
  // cumplir `maxAge`.
  const gcTime = appQueryClient.getDefaultOptions().queries?.gcTime ?? 0
  expect(gcTime).toBeGreaterThanOrEqual(persistOptions.maxAge)
})
