import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken, fetchMe } from "@/lib/auth";

// Hydrate the token cache before any API request fires.
fetchMe().catch(() => {});

// Provide bearer JWT to every generated-client API request automatically.
setAuthTokenGetter(() => getToken());

createRoot(document.getElementById("root")!).render(<App />);
