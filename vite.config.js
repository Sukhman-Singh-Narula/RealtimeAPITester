import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const path = fileURLToPath(import.meta.url);

export default defineConfig({
  root: join(dirname(path), "client"),
  plugins: [react()],
  build: {
    outDir: "../dist/client", // Ensure output is correct
    emptyOutDir: true,
    ssrManifest: true, // Needed for SSR
    rollupOptions: {
      input: "index.html",
    },
  },
  server: {
    port: 3000,
  },
});
