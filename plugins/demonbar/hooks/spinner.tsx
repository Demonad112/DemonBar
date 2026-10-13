import type { Register } from 'claude-code'

import { spin } from './state'
import { THEME as T } from './theme'

// /spinner cycles through these; 'usage' (the first) is the default on every load
const STYLES = ['usage', 'words', 'sweep', 'orbit'] as const

const [FILL, EMPTY] = T.spinner.bar
const bar = (pct: number) => {
  const filled = Math.max(0, Math.min(8, Math.round((pct / 100) * 8)))
  return FILL.repeat(filled) + EMPTY.repeat(8 - filled)
}

// a 3-cell block bouncing across a 10-cell track
const sweep = (frame: number) => {
  const span = 10 - 3
  const p = frame % (span * 2)
  const pos = p <= span ? p : span * 2 - p
  return '[' + '░'.repeat(pos) + '▓▓▓' + '░'.repeat(span - pos) + ']'
}

const ORBIT = ['·  ●  ·', ' · ● · ', '  ·●·  ', ' · ● · ']
const orbit = (frame: number) => ORBIT[frame % ORBIT.length]

const TOOL_EMOJI: Record<string, string> = {
  Read: '🔍', Grep: '🔍', Glob: '🔍', WebSearch: '🔍', WebFetch: '🌐',
  Edit: '✏️', Write: '✏️', NotebookEdit: '✏️',
  Bash: '⚙️', PowerShell: '⚙️', Agent: '🤖',
}

// The session events that feed this (tool count, 5h reading, /spinner registration) are handled in register.tsx.
export const register: Register = on => {
  on('command.run', { command: 'spinner' }, () => {
    spin.style = STYLES[(STYLES.indexOf(spin.style) + 1) % STYLES.length]

    return { text: `Spinner style: ${spin.style} (run /spinner again to cycle)` }
  })

  // the engine keeps its own elapsed time and tokens; only word and suffix change
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const frame = Math.floor((await $.clock.now()) / 150)
    const parts: string[] = []

    if (spin.style === 'sweep') parts.push(sweep(frame))
    if (spin.style === 'orbit') parts.push(orbit(frame))
    if (spin.toolCount > 0) parts.push(`${spin.toolCount} tool${spin.toolCount === 1 ? '' : 's'}`)
    if (spin.fivePct !== null) {
      const shown = T.spinner.usage.mode === 'left' ? Math.max(0, 100 - spin.fivePct) : spin.fivePct
      parts.push(`${T.spinner.usage.label} ${Math.round(shown)}% ${bar(shown)}`)
    }

    let word = T.spinner.words?.[e.props.mode] ?? e.props.word
    if (spin.style === 'words') {
      if (e.props.mode === 'tool-use' && spin.currentTool) {
        word = `${TOOL_EMOJI[spin.currentTool] ?? '🛠️'} ${spin.currentTool}`
      } else if (e.props.mode === 'thinking') word = '🧠 Thinking'
      else if (e.props.mode === 'requesting') word = '📡 Requesting'
      else if (e.props.mode === 'responding') word = '✍️ Responding'
      else if (e.props.mode === 'tool-input') word = '⚙️ Preparing tool'
    }

    if (T.skull) word = `${T.skull.work[Math.floor(frame / 3) % 2]} ${word}`

    const suffix = parts.length ? `… · ${parts.join(' · ')}` : e.props.suffix

    return next({ ...e, props: { ...e.props, word, suffix } })
  })
}
