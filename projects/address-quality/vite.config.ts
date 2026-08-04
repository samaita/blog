import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

export default defineConfig({
  base: "/projects/address-quality/",

  plugins: [
    react(),
    tailwindcss(),
  ],

  envPrefix: "AQ_",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    outDir: "../../static/projects/address-quality",
    emptyOutDir: true,
  },
})