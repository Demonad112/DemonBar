import type { Skin } from '../skin'

// Neon Dusk: every tool kind gets its own hue so a busy transcript reads at a glance.
// Reads cool (cyan), writes hot (pink), runs amber, search violet, web blue, MCP mint.
const skin: Skin = {
  name: 'neon-dusk',
  label: 'Neon Dusk',
  palette: {
    read: '#4dd9e8',
    write: '#ff5fa2',
    run: '#ffb347',
    search: '#b794f6',
    web: '#6aa5ff',
    mcp: '#5eead4',
    other: '#9aa0c8',
    user: '#f0abfc',
    fg: '#e8e6ff',
    muted: '#7a79a6',
    surface: '#1b1830',
    zebra: '#231f3d',
    ok: '#7ee787',
    err: '#ff4d6d',
    warn: '#ffd166',
  },
  light: {
    read: '#0b7285',
    write: '#c2255c',
    run: '#b35c00',
    search: '#6741d9',
    web: '#1c60d6',
    mcp: '#0f766e',
    other: '#5c5f85',
    user: '#a21caf',
    fg: '#1e1b3a',
    muted: '#76749c',
    surface: '#f6f3ff',
    zebra: '#ece7fb',
    ok: '#1a7f37',
    err: '#c9184a',
    warn: '#9a6700',
  },
  spinner: [
    'Synthesizing',
    'Vaporizing',
    'Overclocking',
    'Rendering',
    'Cruising',
    'Glitching',
    'Warping',
    'Booting',
  ],
  done: ['Shipped', 'Locked in', 'Synced', 'Nailed it'],
}

export default skin
