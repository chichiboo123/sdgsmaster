import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO_BASE = "/sdgsmaster/";

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === "build" ? REPO_BASE : "/"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: "0.0.0.0",
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: "0.0.0.0",
  },
}));
