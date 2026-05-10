import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // bind to all interfaces so Tailscale IP is reachable
    proxy: {
      // Browser connects to ws://<host>:5173/ws — Vite proxies server-side to
      // localhost:8000, which is always the machine running Vite (laptop with
      // VS Code port-forward, or the tablet directly).
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        rewrite: () => '/lidar',
      },
    },
  },
})
