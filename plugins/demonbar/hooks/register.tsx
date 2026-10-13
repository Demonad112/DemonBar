import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Call, Footer, GitInfo, Meter, Snap } from '../types'
import { ANSI, BAR_WIDTH, clock, gitInfo, NAMES, NARROW_COLS, parseAnsi, segBar, shortModel, termCols, until } from './format'
import { COMMAND as DEMONBAR_COMMAND, register as demonbarCmdUi } from './demonbar-cmd'
import { register as msgChromeUi } from './msg-chrome'
import { PANES, register as panesUi } from './panes'
import { rewrite } from './refine'
import { register as spinnerUi } from './spinner'
import { hist, spin, turn } from './state'
import { THEME as T } from './theme'
import { register as toolRowsUi } from './tool-rows'

// The same atoms are declared again in msg-chrome.tsx and panes.tsx, where they are read; plugin and key match.
const snapAtom = atom({ plugin: 'demonbar', key: 'snap' } as const, null)
const tickAtom = atom({ plugin: 'demonbar', key: 'tick' } as const, 0)
const callsAtom = atom({ plugin: 'demonbar', key: 'calls' } as const, [] as Call[])
const gitAtom = atom(
  { plugin: 'demonbar', key: 'git' } as const,
  { state: 'unknown', branch: '', stat: '', files: [] } as GitInfo,
)
const footersAtom = atom({ plugin: 'demonbar', key: 'footers' } as const, [] as Footer[])
const costAtStartAtom = atom({ plugin: 'demonbar', key: 'costAtStart' } as const, null as number | null)

// This file owns everything that touches the session: a plugin may register each shared event
// once, and `$` can't be handed to another file, so the single handler for session.start,
// session.measure, turn.start, turn.complete, tool.call and prompt.submit, the band and the
// status refresh all live here. The other files hold features that hook one component.
// Colours, labels and layout come from ./theme.ts, which the active profile supplies.
const B = T.band

// Stepped, not blended.
const shieldColor = (left: number) => (left > 50 ? B.good : left > 25 ? B.mid : left > 10 ? B.low : B.crit)
// Context and weekly fill up, so the warning runs the other way.
const loadColor = (used: number) => (used < 60 ? B.good : used < 80 ? B.mid : used < 92 ? B.low : B.crit)

// True while the first-draw refresh runs, so concurrent renders don't pile up.
let booting = false

// Git for Windows' bash is tried first, then `bash` on PATH; the first that spawns is remembered.
const BASH_CANDIDATES = ['C:/Program Files/Git/usr/bin/bash.exe', 'C:/Program Files (x86)/Git/usr/bin/bash.exe', 'bash']
let bashFound: string | undefined

async function runBash($: EngineInterface, args: string[], options: { stdin?: string; timeoutMs: number }) {
  let failure: unknown
  for (const bash of bashFound === undefined ? BASH_CANDIDATES : [bashFound]) {
    try {
      const result = await $.process.run([bash, ...args], options)
      bashFound = bash
      return result
    } catch (error) {
      failure = error
    }
  }
  bashFound = undefined
  throw failure ?? new Error('bash not found')
}
// The dispatcher, statusline.sh and active-profile.txt ship inside the plugin, under bin/.
const binPath = ($: EngineInterface, name: string) => `${$.plugin.root.replace(/\\/g, '/')}/bin/${name}`

const take = (limits: { kind: string; percentUsed: number }[]) => {
  const five = limits.find(l => l.kind === 'five_hour')
  if (five) spin.fivePct = five.percentUsed
}

// When active-profile.txt names demonbar (or the legacy ccstatusline), run the dispatcher with a status-line
// JSON rebuilt from the session and return its text. Otherwise undefined.
async function externalLine($: EngineInterface, u: any, model: string | undefined, now: number) {
  try {
    const p = await runBash($, ['-c',`/usr/bin/tr -d '[:space:]' < "${binPath($, 'active-profile.txt')}"`], { timeoutMs: 5000 })
    const backend = p.stdout.trim()
    if (backend !== 'demonbar' && backend !== 'ccstatusline') return undefined

    const rate: Record<string, unknown> = {}
    for (const r of u.rateLimits as { kind: string; percentUsed: number; resetsAt?: string }[]) {
      rate[r.kind] = {
        used_percentage: r.percentUsed,
        resets_at: r.resetsAt ? Math.floor(new Date(r.resetsAt).getTime() / 1000) : undefined,
      }
    }
    const cwd = await $.session.cwd()
    const input = {
      session_id: await $.session.id(),
      model: { id: model ?? 'claude', display_name: model ?? 'Claude' },
      workspace: { current_dir: cwd, project_dir: cwd },
      cwd,
      cost: { total_cost_usd: u.cost?.usd ?? 0, total_duration_ms: Math.max(0, now - u.startedAt) },
      context_window: {
        context_window_size: u.context.window,
        used_percentage: u.context.percent,
        total_input_tokens: u.context.tokens ?? 0,
        total_output_tokens: 0,
      },
      rate_limits: rate,
    }
    const r = await runBash($, [binPath($, 'statusline-switch.sh')],{ stdin: JSON.stringify(input), timeoutMs: 10000 })
    const text = r.stdout.replace(/\s+$/, '')
    return r.exitCode === 0 && text ? text : undefined
  } catch {
    return undefined
  }
}

async function refresh($: EngineInterface) {
  try {
    const u = await $.session.usage()
    const now = await $.clock.now()
    let model: string | undefined
    try {
      model = shortModel(await $.session.model())
    } catch {}

    const meters: Meter[] = u.rateLimits.map(r => {
      const resetMs = r.resetsAt ? new Date(r.resetsAt).getTime() : undefined
      const m: Meter = {
        label: NAMES[r.kind] ?? r.kind,
        pct: Math.round(r.percentUsed * 10) / 10,
        reset: resetMs ? until(resetMs - now) : undefined,
        resetAt: resetMs ? clock(resetMs) : undefined,
      }
      if (r.kind === 'five_hour') {
        hist.push({ t: now, pct: r.percentUsed })
        while (hist.length > 1 && now - hist[0].t > 30 * 60000) hist.shift()
        const first = hist[0]
        const mins = (now - first.t) / 60000
        if (mins >= 3 && r.percentUsed > first.pct) {
          m.rate = (r.percentUsed - first.pct) / mins
          const etaMs = now + ((100 - r.percentUsed) / m.rate) * 60000
          if (!resetMs || etaMs < resetMs) m.eta = clock(etaMs)
        }
      }
      return m
    })
    const raw = await externalLine($, u, model, now)
    const snap: Snap = { model, meters, ctx: u.context.percent, cost: u.cost?.usd, raw }
    await update($, snapAtom, () => snap)

    const pills = meters.map(m => `${m.label} ${Math.round(m.pct)}%`)
    if (snap.ctx !== undefined) pills.push(`ctx ${Math.round(snap.ctx)}%`)
    if (snap.cost !== undefined) pills.push(`$${snap.cost.toFixed(2)}`)

    await $.ui.status(raw ? raw.replace(ANSI, '') : pills.length ? pills.join(' · ') : undefined)
  } catch {
    await $.ui.status(undefined)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    take((await $.session.usage()).rateLimits)
    await $.command.register({ name: 'spinner', description: 'Cycle the spinner style: usage, words, sweep, orbit' })
    await $.command.register(DEMONBAR_COMMAND)
    for (const p of PANES) {
      await $.command.register({ name: p.command, description: p.description })
    }

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await refresh($)
    take(e.rateLimits)
    await update($, tickAtom, n => n + 1)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    turn.working = true
    turn.tools = 0
    const u = await $.session.usage()
    await update($, costAtStartAtom, () => u.cost?.usd ?? null)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    turn.working = false
    if (e.agentId === undefined) turn.last = { secs: e.durationMs / 1000, tools: turn.tools }

    if (e.agentId === undefined && e.answer.trim()) {
      const u = await $.session.usage()
      const before = await read($, costAtStartAtom)
      const usd = u.cost && before !== null ? Math.max(0, u.cost.usd - before) : null
      const entry: Footer = { text: e.answer.trim(), seconds: e.durationMs / 1000, usd }
      await update($, footersAtom, list => [...list, entry].slice(-100))
    }

    // keep the changes pane fresh after each turn
    try {
      const s = await $.process.run(['git', 'status', '--short', '--branch'])
      if (s.exitCode !== 0) {
        await update($, gitAtom, () => ({ state: 'none', branch: '', stat: '', files: [] }))
      } else {
        const d = await $.process.run(['git', 'diff', '--shortstat', 'HEAD'])
        await update($, gitAtom, () => gitInfo(s.stdout, d.stdout))
      }
    } catch {
      await update($, gitAtom, () => ({ state: 'none', branch: '', stat: '', files: [] }))
    }

    await refresh($)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    turn.tools += 1
    spin.toolCount += 1
    spin.currentTool = e.tool

    // time the call for the Tool calls pane
    const startedAt = await $.clock.now()
    await update($, callsAtom, list => [...list, { id: e.tool_use_id, tool: e.tool, startedAt, ms: null }].slice(-200))
    const ran = await next(e)
    const ms = (await $.clock.now()) - startedAt
    await update($, callsAtom, list => list.map(c => (c.id === e.tool_use_id ? { ...c, ms } : c)))

    return ran
  })

  on('prompt.submit', ($, e, next) => {
    spin.toolCount = 0
    spin.currentTool = ''

    const text = rewrite(e.text)
    if (text === e.text) return next(e)

    $.ui.toast('refine: brief first, then wait for your go')

    return next({ ...e, text })
  })

  // The band above the prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    let snap = await read($, snapAtom)

    // After a plugin reload no refresh event has fired yet; fetch once so the band isn't blank.
    if (snap === null && !e.props.hasSurvey && !booting) {
      booting = true
      try {
        await refresh($)
        snap = await read($, snapAtom)
      } finally {
        booting = false
      }
    }

    if (e.props.hasSurvey || snap === null) {
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)

    // Two buttons under the band: compact the conversation, and run /remember:remember.
    // Both wait for an idle session; a refusal shows as a toast instead of failing silently.
    const press = (label: string, run: () => Promise<unknown>) => async () => {
      try {
        await run()
      } catch (err) {
        $.ui.toast(`${label}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    const actions = (
      <Box key="actions" columnGap={1} marginLeft={2} flexShrink={0}>
        <Button key="compact" label="Compact" onPress={press('compact', () => $.session.compact())} />
        <Button
          key="remember"
          label="Remember"
          onPress={press('remember', () =>
            $.command.run({ command: 'remember:remember' }).catch(() => $.prompt.submit({ text: '/remember:remember' })),
          )}
        />
      </Box>
    )
    // The last row: the info lines on the left, the buttons at the right end, so the
    // meters above keep the full width and never wrap.
    const bottomRow = (rows: JSX.Element[]) => (
      <Box width="100%" justifyContent="space-between">
        <Box flexDirection="column" flexShrink={1}>
          {rows}
        </Box>
        {actions}
      </Box>
    )

    const five = snap.meters.find(m => m.label === '5h')
    const week = snap.meters.find(m => m.label === '7d')

    const cols = termCols()
    const narrow = cols > 0 && cols < NARROW_COLS

    // One labelled bar: LABEL ▰▰▰▱▱ 63%. A dark "good" colour can set a brighter number colour.
    const gauge = (label: string, pct: number, color: string) => {
      const [fill, track] = segBar(pct, narrow ? 4 : BAR_WIDTH)

      return (
        <Text>
          <Text color={B.muted} bold>{label + ' '}</Text>
          <Text color={color}>{fill}</Text>
          <Text color={B.track}>{track}</Text>
          <Text color={color === B.good ? B.num : color} bold>{` ${Math.round(pct)}%`}</Text>
        </Text>
      )
    }

    const left = five ? Math.max(0, 100 - five.pct) : 100
    const sk = T.skull
    const frame = Math.floor((await $.clock.now()) / 400) % 2
    const skull = sk ? (turn.working ? sk.work[frame] : left <= 10 ? sk.low : sk.idle) : ''

    // The shield (5h left) group, the context group, the weekly group and the last-turn readout.
    const shield = five ? (
      <Box key="shield" marginRight={2}>
        <Text>
          {narrow && sk ? <Text>{skull + ' '}</Text> : null}
          {!sk ? <Text color={B.good} bold>{T.glyph}</Text> : null}
          {gauge(T.labels.shield, left, shieldColor(left))}
          {five.reset && !narrow ? <Text color={B.muted}>{` ◆ ${five.reset}`}</Text> : null}
          {five.eta && !narrow ? <Text color={B.low}>{` ◆ EMPTY ~${five.eta}`}</Text> : null}
        </Text>
      </Box>
    ) : null

    const ctx =
      snap.ctx !== undefined ? (
        <Box key="ctx" marginRight={2}>
          <Text>{gauge(T.labels.ctx, snap.ctx, loadColor(snap.ctx))}</Text>
        </Box>
      ) : null

    const weekly = week ? (
      <Box key="week" marginRight={T.layout === 'flat' ? 3 : 2}>
        <Text>
          {gauge(T.labels.week, week.pct, loadColor(week.pct))}
          {week.reset && !narrow ? <Text color={B.muted}>{` ⟳ ${week.reset}`}</Text> : null}
        </Text>
      </Box>
    ) : null

    const last = turn.last
    const lastTurn =
      last && !narrow && T.layout === 'rows' ? (
        <Box key="turn">
          <Text color={B.muted}>
            {`⏱ ${last.secs.toFixed(1)}s · ${last.tools} tool${last.tools === 1 ? '' : 's'}`}
          </Text>
        </Box>
      ) : null

    const lines = snap.raw ? snap.raw.split(/\r?\n/).filter(l => l.trim()) : []
    const rawRows = lines.map((line, i) => (
      <Text key={i} wrap="truncate-end">
        {parseAnsi(line.replace(/^\s+/, '')).map((s, j) => (
          <Text key={j} color={s.fg} backgroundColor={s.bg} bold={s.bold} dimColor={s.dim}>
            {s.text}
          </Text>
        ))}
      </Text>
    ))

    if (!shield && !ctx && !weekly && rawRows.length === 0) {
      return next(e)
    }

    const withStock = (band: JSX.Element) => band

    // Flat: every gauge in one wrapping row, then the ccstatusline line.
    if (T.layout === 'flat') {
      const groups = [shield, ctx, weekly].filter(Boolean)

      return withStock(
        <Box flexDirection="column" width="100%">
          {groups.length > 0 ? <Box flexWrap="wrap" width="100%">{groups}</Box> : null}
          {bottomRow(rawRows)}
        </Box>,
      )
    }

    // Rows: skull column on the left; shield on row 1, context/weekly/last turn on row 2, then the ccstatusline line.
    const row2 = [ctx, weekly, lastTurn].filter(Boolean)
    const right = (
      <Box flexDirection="column" flexGrow={1}>
        {shield ? <Box flexWrap="wrap">{shield}</Box> : null}
        {row2.length > 0 ? <Box flexWrap="wrap">{row2}</Box> : null}
        {bottomRow(rawRows)}
      </Box>
    )

    // Narrow windows drop the skull column and put the emoji inline in row 1.
    if (narrow || !sk) return withStock(<Box flexDirection="column" width="100%">{right}</Box>)

    return withStock(
      <Box width="100%">
        <Box flexDirection="column" width={6}>
          <Text>{' '}</Text>
          <Text>{`  ${skull}  `}</Text>
          <Text>{' '}</Text>
        </Box>
        {right}
      </Box>,
    )
  })

  spinnerUi(on)
  msgChromeUi(on)
  panesUi(on)
  toolRowsUi(on)
  demonbarCmdUi(on)
}
