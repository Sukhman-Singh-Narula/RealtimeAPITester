import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);

export default {
  root: join(dirname(path), "client"),
  plugins: [react()],
  build: {
    outDir: "dist",
    ssr: "src/index.js", // Ensure this points to your SSR entry file
  },
  server: {
    port: 3000, // Default Vercel port
  },
};
