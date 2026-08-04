import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ShopInfo {
  id: string;
  name: string;
  ownerName: string;
  mobile: string;
  currency: string;
}

interface AuthState {
  accessToken: string | null;
  shop: ShopInfo | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, shop: ShopInfo) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      shop: null,
      isAuthenticated: false,

      setAuth: (accessToken, shop) =>
        set({ accessToken, shop, isAuthenticated: true }),

      setAccessToken: (token) =>
        set({ accessToken: token }),

      logout: () =>
        set({ accessToken: null, shop: null, isAuthenticated: false }),
    }),
    {
      name: 'shop-finance-auth',
      // Persist access token along with shop info so auth headers remain valid across reloads
      partialize: (state) => ({ accessToken: state.accessToken, shop: state.shop, isAuthenticated: state.isAuthenticated }),
    }
  )
);
