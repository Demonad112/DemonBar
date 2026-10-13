import type { Skin } from '../skin'

// Demon Dusk: near-black violet surfaces, ember and blood accents, a warm magenta rail.
const skin: Skin = {
  name: 'demon-dusk',
  label: 'Demon Dusk',
  palette: {
    read: '#d98cff',
    write: '#ff3d5a',
    run: '#ff8a3d',
    search: '#a855f7',
    web: '#e879a8',
    mcp: '#d4a5ff',
    other: '#8a6f9e',
    user: '#c026d3',
    fg: '#e9dcf2',
    muted: '#8a6f9e',
    surface: '#160d1c',
    zebra: '#1d1126',
    ok: '#8fd18a',
    err: '#ff2e4d',
    warn: '#f5b04a',
  },
  light: {
    read: '#8e24aa',
    write: '#c2102f',
    run: '#b34700',
    search: '#6d28d9',
    web: '#b8245f',
    mcp: '#7e3fb0',
    other: '#6b5580',
    user: '#a21caf',
    fg: '#24112e',
    muted: '#7a6190',
    surface: '#f4edf8',
    zebra: '#eadff1',
    ok: '#1a7f37',
    err: '#c9102f',
    warn: '#9a6700',
  },
  spinner: ['Summoning', 'Brooding', 'Conjuring', 'Scheming', 'Haunting', 'Smoldering', 'Hexing', 'Devouring'],
  done: ['Cursed', 'Banished', 'Sealed', 'Consumed'],
}

export default skin
