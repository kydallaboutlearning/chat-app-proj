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
  isCheckingAuth: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  checkAuth: () => Promise<void>
  logout: () => void
}

// NOTE: For now this is a local-only auth stub so we can build the UI.
// When backend endpoints are ready we’ll replace these with real API calls.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isCheckingAuth: true,

      login: async (email, password) => {
        try {
          const res = await api.post('/api/auth/login', { email, password })
          if (res.data.success) {
            set({ user: res.data.user, token: res.data.token, isCheckingAuth: false })
          } else {
            set({ isCheckingAuth: false })
            throw new Error(res.data.error || 'Login failed')
          }
        } catch (error: any) {
          set({ isCheckingAuth: false })
          throw error
        }
      },

      register: async (email, password, name) => {
        try {
          const res = await api.post('/api/auth/register', { email, password, name })
          if (res.data.success) {
            set({ user: res.data.user, token: res.data.token, isCheckingAuth: false })
          } else {
            set({ isCheckingAuth: false })
            throw new Error(res.data.error || 'Registration failed')
          }
        } catch (error: any) {
          set({ isCheckingAuth: false })
          throw error
        }
      },

      googleLogin: async (credential) => {
        try {
          const res = await api.post('/api/auth/google', { credential })
          if (res.data.success) {
            set({ user: res.data.user, token: res.data.token, isCheckingAuth: false })
          } else {
            set({ isCheckingAuth: false })
            throw new Error(res.data.error || 'Google login failed')
          }
        } catch (error: any) {
          set({ isCheckingAuth: false })
          throw error
        }
      },

      checkAuth: async () => {
        const state = useAuthStore.getState()
        if (!state.token) {
          set({ isCheckingAuth: false, user: null })
          return
        }

        try {
          const res = await api.get('/api/auth/me')
          if (res.data.success) {
            set({ user: res.data.user, isCheckingAuth: false })
          } else {
            set({ user: null, token: null, isCheckingAuth: false })
          }
        } catch (error: any) {
          // Token is invalid or expired
          console.log('Token invalid, clearing auth:', error.response?.status)
          set({ user: null, token: null, isCheckingAuth: false })
        }
      },

      logout: () => {
        set({ user: null, token: null, isCheckingAuth: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({ token: s.token }),
    },
  ),
)

