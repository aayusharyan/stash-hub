// Global UI state store using Zustand.
// Manages the active search query string shared across layout and page components.

import { create } from "zustand";

interface UIStore {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
