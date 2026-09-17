// Provides runtime configuration (page size and the browser-facing Stash URL)
// fetched once from GET /api/config at startup so a single build works for any
// deployment.

import { createContext, useContext, type ReactNode } from "react";
import type { AppConfig } from "@/types/stash";

const ConfigContext = createContext<AppConfig>({ externalUrl: "", pageSize: 60 });

// Returns the loaded config; page components read pageSize and externalUrl here.
export function useConfig() {
  return useContext(ConfigContext);
}

export function ConfigProvider({ value, children }: { value: AppConfig; children: ReactNode }) {
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}
