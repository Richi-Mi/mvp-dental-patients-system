import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    // Service worker que guarda la app (HTML, JS, CSS, fuentes, imágenes) para
    // abrirla sin conexión. Solo existe en el build: en `bun run dev` no se
    // registra. No toca las llamadas al API: esos datos los guarda TanStack
    // Query (`lib/query-persister.ts`).
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      // Los íconos ya entran por `globPatterns`; así no se guardan dos veces.
      includeManifestIcons: false,
      manifest: {
        name: "Odontología Familiar GC",
        short_name: "Odontologia GC",
        lang: "es-MX",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/DENTAL_ICON.png", sizes: "64x64", type: "image/png" },
          { src: "/icon_local.png", sizes: "2048x2048", type: "image/png", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // `icon_local.png` (el logo) pesa ~3.5 MB; sin esto no se guarda y
        // sin conexión se vería roto.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Con hash router `/` es la única página; cualquier otra ruta es del
        // API (o `/openapi`) y no debe recibir el HTML de la app.
        navigateFallback: "index.html",
        navigateFallbackAllowlist: [/^\/$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: {
    "import.meta.env.VITE_APP_BUILD": JSON.stringify(Date.now().toString(36)),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  }
})
