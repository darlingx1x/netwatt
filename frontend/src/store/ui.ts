import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'ru' | 'uz' | 'en'
export type Theme = 'light' | 'dark'

interface UiState {
  lang: Lang
  theme: Theme
  setLang: (lang: Lang) => void
  setTheme: (theme: Theme) => void
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      lang: 'ru',
      theme: 'light',
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => {
        set({ theme })
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
        }
      },
    }),
    {
      name: 'netwatt.ui',
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', state.theme === 'dark')
        }
      },
    },
  ),
)
