/**
 * useTheme — gestión de tema con persistencia en localStorage
 * Temas: dark-teal | dark-slate | dark-midnight | light-clean
 */
import { useState, useEffect } from 'react'

export const THEMES = [
  {
    id: 'dark-teal',
    label: 'Dark Teal',
    desc: 'Verde esmeralda',
    dark: true,
    accent: '#00c896',
    bg: '#161d28',
    preview: ['#0e1117', '#141920', '#00c896'],
  },
  {
    id: 'dark-slate',
    label: 'Dark Slate',
    desc: 'Azul corporativo',
    dark: true,
    accent: '#6366f1',
    bg: '#13161f',
    preview: ['#0b0d14', '#111318', '#6366f1'],
  },
  {
    id: 'dark-midnight',
    label: 'Midnight',
    desc: 'Ámbar ejecutivo',
    dark: true,
    accent: '#f59e0b',
    bg: '#111419',
    preview: ['#080a0d', '#0e1014', '#f59e0b'],
  },
  {
    id: 'light-clean',
    label: 'Light Clean',
    desc: 'Modo claro',
    dark: false,
    accent: '#059669',
    bg: '#ffffff',
    preview: ['#f0f2f5', '#ffffff', '#059669'],
  },
]

const STORAGE_KEY = 'sp_theme'
const DEFAULT_THEME = 'dark-teal'

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleDark() {
    const current = THEMES.find(t => t.id === theme)
    if (current?.dark) {
      setTheme('light-clean')
    } else {
      const last = localStorage.getItem(STORAGE_KEY + '_last_dark') || 'dark-teal'
      setTheme(last)
    }
  }

  function applyTheme(id) {
    const t = THEMES.find(x => x.id === id)
    if (t?.dark) localStorage.setItem(STORAGE_KEY + '_last_dark', id)
    setTheme(id)
  }

  const current = THEMES.find(t => t.id === theme) || THEMES[0]

  return { theme, current, applyTheme, toggleDark, themes: THEMES }
}
