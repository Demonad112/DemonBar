import type { Theme } from './theme-types'

// Demon: blood-red shield, ember and amber warnings, emoji skull, demonic spinner words.
export const THEME: Theme = {
  name: 'demon',
  band: {
    good: '#800b13',
    num: '#d7263d',
    mid: '#ff6a00',
    low: '#ffb703',
    crit: '#f5f0e6',
    muted: '#8a6f72',
    track: '#3a1a1f',
    sep: '#5a2a30',
  },
  labels: { shield: 'BLOOD', ctx: 'HUNGER', week: 'CURSE' },
  layout: 'rows',
  skull: { idle: '💀', low: '🩸', work: ['💀', '☠️'] },
  glyph: '',
  spinner: {
    words: {
      thinking: 'Brooding',
      requesting: 'Summoning',
      responding: 'Rending',
      'tool-input': 'Binding',
      'tool-use': 'Devouring',
    },
    bar: ['▰', '▱'],
    usage: { label: 'BLOOD', mode: 'left' },
  },
  footer: '#ff6a00',
  panes: { low: '#d7263d', mid: '#ff6a00', hi: '#f5f0e6', accent: '#d7263d' },
}
