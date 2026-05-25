/**
 * useTheme — gestión de tema con persistencia en localStorage
 * Temas: oscuro | ocean | forest | sunset | midnight | nature | light
 */
import { useState, useEffect } from 'react'

export const THEMES = [
  {
    id: 'light',
    label: 'Claro',
    desc: 'Modo claro',
    emoji: '☀️',
    dark: false,
    accent: '#059669',
    preview: ['#f0f2f5', '#ffffff', '#059669'],
  },
  {
    id: 'oscuro',
    label: 'Oscuro',
    desc: 'Verde esmeralda',
    emoji: '🌙',
    dark: true,
    accent: '#00c896',
    preview: ['#0e1117', '#141920', '#00c896'],
  },
  {
    id: 'ocean',
    label: 'Océano',
    desc: 'Azul profundo',
    emoji: '🌊',
    dark: true,
    accent: '#0ea5e9',
    preview: ['#0a1220', '#0f1a2e', '#0ea5e9'],
  },
  {
    id: 'forest',
    label: 'Bosque',
    desc: 'Verde natural',
    emoji: '🌿',
    dark: true,
    accent: '#22c55e',
    preview: ['#0a1210', '#111f14', '#22c55e'],
  },
  {
    id: 'sunset',
    label: 'Atardecer',
    desc: 'Cálido y vibrante',
    emoji: '🌅',
    dark: true,
    accent: '#f97316',
    preview: ['#130c1e', '#1e1232', '#f97316'],
  },
  {
    id: 'midnight',
    label: 'Medianoche',
    desc: 'Ámbar ejecutivo',
    emoji: '🌃',
    dark: true,
    accent: '#f59e0b',
    preview: ['#08080a', '#0e0e12', '#f59e0b'],
  },
  {
    id: 'nature',
    label: 'Naturaleza',
    desc: 'Tierra cálida',
    emoji: '🍃',
    dark: true,
    accent: '#84cc16',
    preview: ['#100f08', '#1a180a', '#84cc16'],
  },
]

const STORAGE_KEY = 'sp_theme'
const DEFAULT_THEME = 'oscuro'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
    // Migrar IDs viejos al nuevo esquema
    const map = { 'dark-teal': 'oscuro', 'dark-slate': 'ocean', 'dark-midnight': 'midnight', 'light-clean': 'light' }
    return map[stored] || stored
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleDark() {
    const current = THEMES.find(t => t.id === theme)
    if (current?.dark) {
      setTheme('light')
    } else {
      const last = localStorage.getItem(STORAGE_KEY + '_last_dark') || DEFAULT_THEME
      setTheme(last)
    }
  }

  function applyTheme(id) {
    const t = THEMES.find(x => x.id === id)
    if (t?.dark) localStorage.setItem(STORAGE_KEY + '_last_dark', id)
    setTheme(id)
  }

  const current = THEMES.find(t => t.id === theme) || THEMES[1]

  return { theme, current, applyTheme, toggleDark, themes: THEMES }
}
