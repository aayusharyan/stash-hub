"use client";

// Root client-side provider tree. Wraps the app in Apollo (for GraphQL),
// ThemeProvider (light/dark mode and accent colour), and ViewProvider (grid density).

import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/lib/apollo-client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ViewProvider } from "@/contexts/ViewContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider>
        <ViewProvider>
          {children}
        </ViewProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}
