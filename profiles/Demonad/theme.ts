import type { Theme } from './theme-types'

// Demonad (halo): cyan shield, gold and orange warnings.
export const THEME: Theme = {
  name: 'demonad',
  band: {
    good: '#4fd8ff',
    num: '#4fd8ff',
    mid: '#f5c542',
    low: '#ff9d2e',
    crit: '#ff4d4d',
    muted: '#7f9f98',
    track: '#2a3f46',
    sep: '#3a5560',
  },
  labels: { shield: 'SHIELD', ctx: 'CTX', week: '7D' },
  layout: 'flat',
  skull: null,
  glyph: '◢ ',
  spinner: {
    words: null,
    bar: ['▓', '░'],
    usage: { label: '5h', mode: 'used' },
  },
  footer: '#6fa8ff',
  panes: { low: '#4fd8ff', mid: '#f5c542', hi: '#ff4d4d', accent: '#4fd8ff' },
}
