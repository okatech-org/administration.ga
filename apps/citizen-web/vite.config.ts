import fs from "node:fs"
import path from "node:path"
import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const certsDir = path.resolve(__dirname, "../../.certs")
const certFile = path.join(certsDir, "localhost+2.pem")
const keyFile = path.join(certsDir, "localhost+2-key.pem")
const hasLocalCerts = fs.existsSync(certFile) && fs.existsSync(keyFile)

const config = defineConfig({
  plugins: [
    nitro(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    host: "0.0.0.0",
    ...(hasLocalCerts ? { https: { cert: certFile, key: keyFile } } : {}),
  },
})

export default config
