import { create } from "zustand";

type UiState = {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
}));
