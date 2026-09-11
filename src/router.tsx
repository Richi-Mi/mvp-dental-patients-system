import { createHashRouter } from "react-router"

import { routes } from "@/routes"

// Hash router: el backend sirve el build como estáticos y solo responde `/`,
// así que las rutas del cliente viven en el fragmento (`/#/agenda`).
export const router = createHashRouter(routes)
