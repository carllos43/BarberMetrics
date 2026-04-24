import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { getToken, fetchMe } from "@/lib/auth";

// Em produção (Vercel), o backend pode estar em outro domínio. Configure
// VITE_API_BASE_URL no painel da Vercel (ex.: https://seu-backend.vercel.app).
// Em dev / Replit, mantemos chamadas relativas (proxy do Vite cuida disso).
const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
if (apiBase) {
  setBaseUrl(apiBase);
}

// Hydrate the token cache before any API request fires.
fetchMe().catch(() => {});

// Provide bearer JWT to every generated-client API request automatically.
setAuthTokenGetter(() => getToken());

createRoot(document.getElementById("root")!).render(<App />);
