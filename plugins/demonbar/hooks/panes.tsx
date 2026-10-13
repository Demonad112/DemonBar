import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Call, GitInfo } from '../types'
import { gitInfo } from './format'
import { THEME as T } from './theme'

const tickAtom = atom({ plugin: 'statusbar', key: 'tick' } as const, 0)
const callsAtom = atom({ plugin: 'statusbar', key: 'calls' } as const, [] as Call[])
const gitAtom = atom(
  { plugin: 'statusbar', key: 'git' } as const,
  { state: 'unknown', branch: '', stat: '', files: [] } as GitInfo,
)

export const PANES = [
  { id: 'usage-pane', command: 'usage-pane', title: 'Usage', description: 'Show 5h / 7d usage in a pane' },
  { id: 'changes', command: 'changes', title: 'Changes', description: 'Show git branch and changed files in a pane' },
  { id: 'calls', command: 'calls', title: 'Tool calls', description: 'Show this session\'s tool calls with timings' },
]

const COLOR = T.panes
const hue = (pct: number) => (pct >= 80 ? COLOR.hi : pct >= 50 ? COLOR.mid : COLOR.low)

const bar = (pct: number, width = 16) => {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return '▓'.repeat(filled) + '░'.repeat(width - filled)
}

const until = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  return d > 0 ? `${d}d${h}h` : h > 0 ? `${h}h${m % 60}m` : `${m}m`
}

async function refreshGit($: EngineInterface) {
  try {
    const s = await $.process.run(['git', 'status', '--short', '--branch'])
    if (s.exitCode !== 0) {
      await update($, gitAtom, () => ({ state: 'none', branch: '', stat: '', files: [] }))
      return
    }
    const d = await $.process.run(['git', 'diff', '--shortstat', 'HEAD'])
    await update($, gitAtom, () => gitInfo(s.stdout, d.stdout))
  } catch {
    await update($, gitAtom, () => ({ state: 'none', branch: '', stat: '', files: [] }))
  }
}

// Command registration, the usage redraw tick, call timing and the per-turn git refresh are handled in register.tsx.
export const register: Register = on => {
  for (const p of PANES) {
    on('command.run', { command: p.command }, async $ => {
      if (p.id === 'changes') await refreshGit($)
      await $.ui.open({ id: p.id, title: p.title })

      return { text: `${p.title} pane opened.` }
    })
  }

  on('ui.render', { component: 'Pane', requestId: 'usage-pane' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    await read($, tickAtom)
    const usage = await $.session.usage()
    const now = await $.clock.now()

    return (
      <Box flexDirection="column">
        {usage.rateLimits.length === 0 && <Text dimColor>No rate-limit reading yet</Text>}
        {usage.rateLimits.map(r => (
          <Text key={r.kind}>
            <Text bold>{r.kind} </Text>
            <Text color={hue(r.percentUsed)}>{bar(r.percentUsed)}</Text>
            <Text> {Math.round(r.percentUsed)}%</Text>
            {r.resetsAt ? <Text dimColor> resets in {until(new Date(r.resetsAt).getTime() - now)}</Text> : null}
          </Text>
        ))}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: 'changes' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const g = await read($, gitAtom)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)

    if (g.state !== 'ok') {
      return <Text dimColor>{g.state === 'none' ? 'Not a git repository.' : 'Run /changes to load.'}</Text>
    }

    return (
      <Box flexDirection="column">
        <Text color={COLOR.accent} bold>
          {g.branch}
        </Text>
        <Text dimColor>{g.stat || 'clean'}</Text>
        {g.files.slice(0, room).map(f => (
          <Text key={f}>{f}</Text>
        ))}
        {g.files.length > room && <Text dimColor>… {g.files.length - room} more</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: 'calls' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, callsAtom)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 4)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>No tool calls yet.</Text>}
        {list.slice(-room).map(c => (
          <Text key={c.id} dimColor={c.ms !== null}>
            {c.ms === null ? '⏳' : '✓'} {c.tool}
            {c.ms !== null ? ` ${(c.ms / 1000).toFixed(1)}s` : ''}
          </Text>
        ))}
      </Box>
    )
  })
}
