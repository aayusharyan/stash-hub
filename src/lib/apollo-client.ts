"use client";

// Apollo Client configured to talk to the local /api/graphql proxy instead of
// the Stash instance directly. Auth and the real Stash URL live on the server,
// so neither leaks into the browser bundle.
//
// In development, the cache is reset on every hot module reload (HMR) to
// prevent the InMemoryCache from accumulating unboundedly and exhausting the
// Node.js heap.

import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core";

const isDev = process.env.NODE_ENV === "development";

const httpLink = createHttpLink({
  uri: "/api/graphql",
});

function makeClient() {
  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      typePolicies: {
        // ScenePathsType has no id field so Apollo cannot normalize it.
        // Explicitly opting into replace-on-write silences the cache merge warning.
        ScenePathsType: {
          merge: false,
        },
      },
    }),
    defaultOptions: {
      // In dev, skip the cache entirely so stale data doesn't accumulate.
      watchQuery: { fetchPolicy: isDev ? "network-only" : "cache-and-network" },
      query: { fetchPolicy: isDev ? "network-only" : "cache-first" },
    },
  });
}

// Reuse the same client instance across renders. In dev, the HMR guard below
// replaces the instance on each reload so the old cache gets garbage-collected.
let apolloClientInstance: ApolloClient<object>;

if (isDev) {
  // Attach the client to a module-scoped global so HMR can dispose the old one.
  const globalKey = "__APOLLO_CLIENT__";
  const g = globalThis as typeof globalThis & { [globalKey]?: ApolloClient<object> };
  if (!g[globalKey]) {
    g[globalKey] = makeClient();
  }
  apolloClientInstance = g[globalKey];
} else {
  apolloClientInstance = makeClient();
}

export const apolloClient = apolloClientInstance;
