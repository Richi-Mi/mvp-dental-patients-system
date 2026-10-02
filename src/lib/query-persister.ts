import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import {
  defaultShouldDehydrateQuery,
  type Query,
  type QueryClient,
} from "@tanstack/react-query"
import type { Persister } from "@tanstack/react-query-persist-client"
import { del, get, set } from "idb-keyval"

import { CACHE_MAX_AGE } from "@/lib/query-client"
import { useAuthStore } from "@/store/auth.store"

/**
 * La caché de TanStack Query se guarda en IndexedDB para que, al reabrir el
 * navegador sin conexión, se vea lo último que se cargó (agenda, pacientes,
 * expedientes…). No en `localStorage`: sus ~5 MB se comparten con la cola
 * sin conexión, y llenarlo haría fallar también la cola.
 */
export const queryPersister = createAsyncStoragePersister({
  key: "dentalcare.queries",
  storage: {
    getItem: (key) => get<string>(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
})

export const persistOptions = {
  persister: queryPersister,
  maxAge: CACHE_MAX_AGE,
  // Cada build descarta la caché del anterior: los datos guardados tienen la
  // forma que producían los mappers de esa versión.
  buster: import.meta.env.VITE_APP_BUILD ?? "dev",
  dehydrateOptions: {
    // Se omiten las consultas con `meta: { persist: false }`, como las
    // imágenes de los pacientes (`usePhotoFile`): `JSON.stringify` guardaría
    // el Blob como `{}` y son imágenes clínicas que no deben quedar en el equipo.
    shouldDehydrateQuery: (query: Query) =>
      defaultShouldDehydrateQuery(query) && query.meta?.persist !== false,
  },
}

/**
 * Al cerrarse la sesión (logout o un 401 de `api/client.ts`) borra los datos
 * guardados: son datos clínicos y no deben quedar al alcance de quien use el
 * equipo después. Devuelve la función para dejar de escuchar.
 */
export function clearCacheOnSessionEnd(queryClient: QueryClient, persister: Persister) {
  return useAuthStore.subscribe((state, previous) => {
    if (previous.token && !state.token) {
      queryClient.clear()
      void persister.removeClient()
    }
  })
}
