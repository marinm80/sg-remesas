import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Inicialización desde localStorage para persistencia
  const storedToken = localStorage.getItem('accessToken');
  const storedRefreshToken = localStorage.getItem('refreshToken');
  const storedUser = localStorage.getItem('user');

  let user: User | null = null;
  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('user');
    }
  }

  return {
    token: storedToken,
    refreshToken: storedRefreshToken,
    user,
    isAuthenticated: !!storedToken,
    login: (token, refreshToken, user) => {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, refreshToken, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
    },
    updateUser: (userData) => {
      set((state) => {
        if (!state.user) return state;
        const updated = { ...state.user, ...userData };
        localStorage.setItem('user', JSON.stringify(updated));
        return { user: updated };
      });
    },
  };
});
