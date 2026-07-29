import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  notificationCenterOpen: boolean;
  activeModal: string | null;
  activeDrawer: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setNotificationCenterOpen: (open: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  notificationCenterOpen: false,
  activeModal: null,
  activeDrawer: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setNotificationCenterOpen: (open) => set({ notificationCenterOpen: open }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  openDrawer: (id) => set({ activeDrawer: id }),
  closeDrawer: () => set({ activeDrawer: null }),
}));

export const providers = null; // UI store doesn't need a provider
