import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/", 
  plugins: [
    react(),
    tailwindcss(),
    // Removi os plugins do Replit aqui para não dar erro de "Package not found"
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "../../attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist", // A Vercel prefere assim, direto e reto
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true,
  },
});
