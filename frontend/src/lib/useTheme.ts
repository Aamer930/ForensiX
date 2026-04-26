import { createContext, useContext, useState, useCallback, useEffect } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'forensix_theme'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
})

export function useThemeState(): ThemeContextValue {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  const [theme, setTheme] = useState<Theme>(saved === 'light' ? 'light' : 'dark')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
