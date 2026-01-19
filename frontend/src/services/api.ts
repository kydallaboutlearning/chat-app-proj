import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

export const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage')
  if (!token) return config

  // `auth-storage` is Zustand persist; we only persist token, stored as JSON.
  try {
    const parsed = JSON.parse(token) as { state?: { token?: string | null } }
    const jwt = parsed?.state?.token
    if (jwt) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${jwt}`
    }
  } catch {
    // ignore
  }

  return config
})

