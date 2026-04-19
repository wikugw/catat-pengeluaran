'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'oled'

const ThemeContext = createContext<{ theme: Theme; cycle: () => void }>({
  theme: 'dark',
  cycle: () => {},
})

function applyTheme(t: Theme) {
  const cl = document.documentElement.classList
  cl.remove('dark', 'oled')
  if (t === 'dark') cl.add('dark')
  if (t === 'oled') cl.add('dark', 'oled')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    const preferred = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(preferred as Theme)
    applyTheme(preferred as Theme)
  }, [])

  function cycle() {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : prev === 'dark' ? 'oled' : 'light'
      localStorage.setItem('theme', next)
      applyTheme(next)
      return next
    })
  }

  return <ThemeContext.Provider value={{ theme, cycle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
