import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/super-zoos-adventure-v3/",
  build: {
    outDir: "dist",
    sourcemap: true,
    emptyOutDir: true,
  },
});
