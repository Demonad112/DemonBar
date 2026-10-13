// Shared plain state. The atoms (snap, tick, calls, git, footers, costAtStart) are declared in the files
// that read and write them, with the same plugin and key, because the state library needs them in view there.

// Turn state for the band's skull and last-turn readout.
export const turn = {
  working: false,
  tools: 0,
  last: null as { secs: number; tools: number } | null,
}

// Spinner state: the chosen style, the latest 5h reading, and this prompt's tool use.
export const spin = {
  style: 'usage' as 'usage' | 'words' | 'sweep' | 'orbit',
  fivePct: null as number | null,
  currentTool: '',
  toolCount: 0,
}

// Recent five_hour readings for the burn rate.
export const hist: { t: number; pct: number }[] = []
