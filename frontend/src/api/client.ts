import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuth } from '@/store/auth'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
  timeout: 30_000,
})

api.interceptors.request.use((cfg) => {
  const token = useAuth.getState().accessToken
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true
      refreshing ??= useAuth.getState().refresh()
      try {
        const token = await refreshing
        refreshing = null
        if (token && original.headers) {
          original.headers.Authorization = `Bearer ${token}`
        }
        return api(original)
      } catch (e) {
        refreshing = null
        useAuth.getState().logout()
        throw e
      }
    }
    throw err
  },
)
