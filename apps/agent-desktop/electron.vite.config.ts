import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import { resolve } from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    server: {
      // Prevent full-page reload when the Electron window loses/regains focus
      hmr: { overlay: false },
    },
    plugins: [
      viteTsConfigPaths({ projects: [resolve(__dirname, "tsconfig.json")] }),
      tailwindcss(),
      react(),
    ],
    resolve: {
      alias: {
        "@convex": resolve(__dirname, "../../convex"),
        "@workspace/ui": resolve(__dirname, "../../packages/ui/src"),
        "@workspace/api": resolve(__dirname, "../../packages/api/src"),
        "@workspace/shared": resolve(__dirname, "../../packages/shared/src"),
        "@workspace/i18n": resolve(__dirname, "../../packages/i18n/src"),
      },
    },
    build: {
      outDir: resolve(__dirname, "out/renderer"),
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
        },
      },
    },
  },
})
