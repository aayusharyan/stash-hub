"use client";

// Manages view preferences: grid density (1 = fewest/largest cards, 5 = most/smallest)
// persisted to localStorage so the setting survives page reloads.

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// 1 = very sparse, 3 = default, 5 = very dense
export type GridDensity = 1 | 2 | 3 | 4 | 5;

interface ViewContextValue {
  gridDensity: GridDensity;
  setGridDensity: (d: GridDensity) => void;
}

const ViewContext = createContext<ViewContextValue>({
  gridDensity: 3,
  setGridDensity: () => {},
});

export function useView() {
  return useContext(ViewContext);
}

const STORAGE_DENSITY = "stash-hub-grid-density";

// Complete Tailwind grid-template-columns class strings keyed by density.
// Must be complete static strings so Tailwind's static scanner includes them in the CSS bundle.
export const SCENE_GRID_CLASS: Record<GridDensity, string> = {
  1: "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2",
  2: "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3",
  3: "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4",
  4: "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5",
  5: "grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6",
};

export const PERFORMER_GRID_CLASS: Record<GridDensity, string> = {
  1: "grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3",
  2: "grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4",
  3: "grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5",
  4: "grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6",
  5: "grid gap-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8",
};

export const STUDIO_GRID_CLASS: Record<GridDensity, string> = {
  1: "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2",
  2: "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3",
  3: "grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4",
  4: "grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5",
  5: "grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6",
};

export function ViewProvider({ children }: { children: ReactNode }) {
  const [gridDensity, setGridDensityState] = useState<GridDensity>(3);

  // Hydrate from localStorage on first client render.
  useEffect(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_DENSITY) ?? "3", 10);
    if (saved >= 1 && saved <= 5) setGridDensityState(saved as GridDensity);
  }, []);

  function setGridDensity(d: GridDensity) {
    setGridDensityState(d);
    localStorage.setItem(STORAGE_DENSITY, String(d));
  }

  return (
    <ViewContext.Provider value={{ gridDensity, setGridDensity }}>
      {children}
    </ViewContext.Provider>
  );
}
