import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  return {
    base: "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(__dirname, "../../attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.SUPABASE_URL ?? ""),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(env.SUPABASE_ANON_KEY ?? ""),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      // esbuild minifier — mais rápido que Terser e bom o suficiente. Já é o default,
      // mas deixamos explícito.
      minify: "esbuild",
      cssMinify: "esbuild",
      target: "es2022",
      // Code splitting agressivo: cada lib grande vira chunk próprio
      // pra o navegador baixar só o que precisa e cachear melhor entre deploys.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) {
              return "react-vendor";
            }
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("@tanstack")) return "tanstack";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
              return "forms";
            }
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("date-fns") || id.includes("dayjs")) return "dates";
            if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
            return "vendor";
          },
        },
      },
      // Avisa se algum chunk ultrapassar 500 KB pra pegarmos no radar.
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: Number(process.env.PORT) || 3000,
      host: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
  };
});
