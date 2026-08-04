import { create } from 'zustand';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

interface ShopState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toasts: ToastMessage[];
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useShopStore = create<ShopState>((set) => ({
  theme: (localStorage.getItem('shop-theme') as 'light' | 'dark') || 'light',
  sidebarOpen: false,
  toasts: [],

  setTheme: (theme) => {
    localStorage.setItem('shop-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('shop-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      return { theme: newTheme };
    });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addToast: (type, message) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    // Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
