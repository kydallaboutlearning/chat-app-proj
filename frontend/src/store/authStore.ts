import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { api } from '../services/api'

type User = {
  id: string
  name: string
  email: string
  picture?: string | null
}

type AuthState = {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  logout: () => void
}

// NOTE: For now this is a local-only auth stub so we can build the UI.
// When backend endpoints are ready we’ll replace these with real API calls.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        const res = await api.post('/api/auth/login', { email, password })
        if (res.data.success) {
          set({ user: res.data.user, token: res.data.token })
        } else {
          throw new Error(res.data.error || 'Login failed')
        }
      },

      register: async (email, password, name) => {
        const res = await api.post('/api/auth/register', { email, password, name })
        if (res.data.success) {
          set({ user: res.data.user, token: res.data.token })
        } else {
          throw new Error(res.data.error || 'Registration failed')
        }
      },

      googleLogin: async (credential) => {
        const res = await api.post('/api/auth/google', { credential })
        if (res.data.success) {
          set({ user: res.data.user, token: res.data.token })
        } else {
          throw new Error(res.data.error || 'Google login failed')
        }
      },

      logout: () => {
        set({ user: null, token: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({ token: s.token }),
    },
  ),
)

