import axios from 'axios'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'engineer'
  lang: 'ru' | 'uz' | 'en'
  is_active: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  login: (email: string, password: string) => Promise<void>
  refresh: () => Promise<string>
  logout: () => void
  me: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      async login(email, password) {
        const { data } = await axios.post('/api/auth/login', { email, password })
        set({
          user: data.user,
          accessToken: data.tokens.access_token,
          refreshToken: data.tokens.refresh_token,
        })
      },
      async refresh() {
        const rt = get().refreshToken
        if (!rt) throw new Error('no_refresh_token')
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: rt })
        set({ accessToken: data.access_token, refreshToken: data.refresh_token })
        return data.access_token as string
      },
      logout() {
        set({ user: null, accessToken: null, refreshToken: null })
      },
      async me() {
        const token = get().accessToken
        if (!token) return
        const { data } = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        set({ user: data })
      },
    }),
    { name: 'netwatt.auth' },
  ),
)
