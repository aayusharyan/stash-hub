// Application entry point. Before rendering, it fetches runtime config from the
// backend so page components have the correct page size and external Stash URL
// synchronously. Then it wires up React Query, the config/theme/view providers,
// and the router.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "@/App";
import { api } from "@/lib/api";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ViewProvider } from "@/contexts/ViewContext";
import type { AppConfig } from "@/types/stash";
import "@/index.css";

// Shared query client. Focus refetching is off to avoid surprise reloads while
// watching a video; a short stale time keeps lists reasonably fresh.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// Fetches config, tolerating failure with sensible defaults so the app still
// renders (media/data calls would then surface their own errors).
async function loadConfig(): Promise<AppConfig> {
  try {
    return await api.config();
  } catch {
    return { externalUrl: "", pageSize: 60 };
  }
}

async function bootstrap() {
  const config = await loadConfig();
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider value={config}>
          <ThemeProvider>
            <ViewProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ViewProvider>
          </ThemeProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

void bootstrap();
