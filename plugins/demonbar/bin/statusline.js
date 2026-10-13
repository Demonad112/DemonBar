#!/usr/bin/env node
// Claude Code status line (Node port of statusline.sh, no jq needed): coloured bars for 5h / 7d usage,
// burn rate, exhaustion ETA, weekly pace, context tokens, git, cost/hour, lines changed, duration, version.
// Reads Claude Code's status JSON on stdin. Never errors: prints nothing if it can't work.
// Env: STATUSLINE_COLS=<n> forces the width used for the compact-mode decision.
'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

function main(raw) {
  let j
  try { j = JSON.parse(raw) } catch { return '' }
  if (!j || typeof j !== 'object') return ''
  const g = (o, ...ks) => ks.reduce((a, k) => (a == null ? undefined : a[k]), o)
  const num = v => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? '' : Number(v))
  const str = v => (v === undefined || v === null ? '' : String(v))

  const model = str(g(j, 'model', 'display_name'))
  const cwd = str(g(j, 'workspace', 'current_dir') || j.cwd)
  const cost = num(g(j, 'cost', 'total_cost_usd'))
  const durMs = num(g(j, 'cost', 'total_duration_ms'))
  const added = num(g(j, 'cost', 'total_lines_added'))
  const removed = num(g(j, 'cost', 'total_lines_removed'))
  const style = str(g(j, 'output_style', 'name'))
  const vim = str(g(j, 'vim', 'mode'))
  const ver = str(j.version)
  const ctxSize = num(g(j, 'context_window', 'context_window_size'))
  const sid = str(j.session_id) || 'default'
  let fivePct = num(g(j, 'rate_limits', 'five_hour', 'used_percentage'))
  const fiveResets = num(g(j, 'rate_limits', 'five_hour', 'resets_at'))
  let weekPct = num(g(j, 'rate_limits', 'seven_day', 'used_percentage'))
  const weekResets = num(g(j, 'rate_limits', 'seven_day', 'resets_at'))
  const ctxPct = num(g(j, 'context_window', 'used_percentage'))

  const now = Math.floor(Date.now() / 1000)
  const cacheDir = path.join(os.homedir(), '.claude', 'statusline-cache')
  try { fs.mkdirSync(cacheDir, { recursive: true }) } catch {}
  const cacheFile = path.join(cacheDir, sid.replace(/[^A-Za-z0-9_-]/g, '_'))

  // cache lines: five_pct, five_resets, week_pct, week_resets, ref_ts, ref_pct, rate
  let c = ['', '', '', '', '', '', '']
  try {
    const lines = fs.readFileSync(cacheFile, 'utf8').split('\n')
    c = c.map((_, i) => lines[i] || '')
  } catch {}
  let [, cFiveResets, , cWeekResets, refTs, refPct, rate] = c
  const cFivePct = c[0], cWeekPct = c[2]

  const hold = (n, cached, resets) =>
    cached !== '' && n < Number(cached) && !(resets !== '' && now >= Number(resets)) ? Number(cached) : n

  if (fivePct !== '') {
    if (cFiveResets !== '' && now >= Number(cFiveResets)) { refTs = ''; refPct = ''; rate = '' }
    fivePct = hold(fivePct, cFivePct, cFiveResets)
    cFiveResets = fiveResets !== '' ? String(fiveResets) : cFiveResets
  }
  if (weekPct !== '') {
    weekPct = hold(weekPct, cWeekPct, cWeekResets)
    cWeekResets = weekResets !== '' ? String(weekResets) : cWeekResets
  }

  // burn rate (%/min) from a reference sample, refreshed every 5 min
  if (fivePct !== '') {
    if (refTs === '') { refTs = String(now); refPct = String(fivePct); rate = '' } else {
      const el = now - Number(refTs)
      if (el >= 60) {
        const d = fivePct - Number(refPct)
        rate = d > 0 ? (d / (el / 60)).toFixed(2) : ''
        if (el >= 300) { refTs = String(now); refPct = String(fivePct) }
      }
    }
  }
  try {
    fs.writeFileSync(cacheFile, [fivePct, cFiveResets, weekPct, cWeekResets, refTs, refPct, rate].join('\n') + '\n')
  } catch {}

  const cols = Number(process.env.STATUSLINE_COLS || process.env.COLUMNS) || 160
  const compact = cols < 100

  const ESC = '\x1b'
  const RST = ESC + '[0m', DIM = ESC + '[2m', BOLD = ESC + '[1m'
  const LOW = ESC + '[38;5;75m', MID = ESC + '[38;5;141m', HI = ESC + '[38;5;205m'
  const CYN = ESC + '[38;5;117m', MAG = ESC + '[38;5;177m'
  const OKG = ESC + '[38;5;78m', BAD = ESC + '[38;5;203m'
  const SEP = compact ? `${DIM} · ${RST}` : ` ${DIM}│${RST} `

  const paint = (pct, text) => `${pct >= 90 ? BOLD : ''}${pct >= 80 ? HI : pct >= 50 ? MID : LOW}${text}${RST}`
  const bar = (pct, w = 8) => {
    const f = Math.max(0, Math.min(w, Math.floor((pct / 100) * w + 0.5)))
    return '▓'.repeat(f) + '░'.repeat(w - f)
  }
  // printf '%.0f' rounds halves to even; match it so both backends print the same figure
  const roundEven = x => { const f = Math.floor(x); const d = x - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : f % 2 === 0 ? f : f + 1 }
  const pad2 = n => String(n).padStart(2, '0')
  const timeUntil = ts => {
    const d = ts - now
    if (d <= 0) return 'now'
    const days = Math.floor(d / 86400), hrs = Math.floor((d % 86400) / 3600), mins = Math.floor((d % 3600) / 60)
    if (days > 0) return `${days}d${pad2(hrs)}h`
    if (hrs > 0) return `${hrs}h${pad2(mins)}m`
    return `${mins}m`
  }
  const fmtDur = s => (s >= 3600 ? `${Math.floor(s / 3600)}h${pad2(Math.floor((s % 3600) / 60))}m` : `${Math.floor(s / 60)}m`)
  const segment = (label, pct) => {
    const r = roundEven(pct)
    return compact
      ? `${DIM}${label}${RST} ${paint(pct, r + '%')}`
      : `${DIM}${label}${RST} ${paint(pct, bar(pct))} ${paint(pct, r + '%')}`
  }
  const hhmm = ts => { const d = new Date(ts * 1000); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}` }

  const out = []
  const git = args => { try { return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).trim() } catch { return '' } }

  if (!compact && model) {
    let s = `${CYN}🧠 ${model}${RST}`
    if (style && style !== 'default') s += ` ${DIM}[${style}]${RST}`
    if (vim) s += ` ${DIM}(${vim})${RST}`
    out.push(s)
  }

  if (!compact && cwd) {
    let s = `${MAG}📁 ${path.basename(cwd.replace(/[\\/]+$/, ''))}${RST}`
    const branch = git(['symbolic-ref', '--short', '-q', 'HEAD']) || git(['rev-parse', '--short', 'HEAD'])
    if (branch) s += ` ${CYN}🌿 ${branch}${git(['status', '--porcelain']) ? '*' : ''}${RST}`
    out.push(s)
  }

  if (fivePct !== '') {
    let s = segment('5h', fivePct)
    if (fivePct >= 90) s = `${HI}⚠️${RST} ${s}`
    if (cFiveResets !== '') s += ` ${DIM}⏳${timeUntil(Number(cFiveResets))}${RST}`
    if (rate !== '') {
      s += ` ${MID}🔥${rate}%/min${RST}`
      const r = Number(rate)
      if (r > 0 && fivePct < 100) {
        const t = Math.floor(now + ((100 - fivePct) / r) * 60)
        const rs = Number(cFiveResets || 0)
        if (rs === 0 || t < rs) s += ` ${HI}→${hhmm(t)}${RST}`
      }
    }
    out.push(s)
  }

  if (weekPct !== '') {
    let s = segment('7d', weekPct)
    if (cWeekResets !== '') {
      s += ` ${DIM}${timeUntil(Number(cWeekResets))}${RST}`
      const e = 1 - (Number(cWeekResets) - now) / 604800
      if (e > 0.02 && e <= 1) {
        const pace = (weekPct / 100) / e
        const p = pace.toFixed(2)
        s += pace <= 0.9 ? ` ${OKG}🟢×${p}${RST}` : pace <= 1.1 ? ` ${MID}🟡×${p}${RST}` : ` ${BAD}🔴×${p}${RST}`
      }
    }
    out.push(s)
  }

  if (ctxPct !== '') {
    let s = segment('ctx', ctxPct)
    if (!compact && ctxSize !== '') {
      s += ` ${DIM}${Math.floor((ctxPct / 100) * ctxSize / 1000 + 0.5)}k/${Math.floor(ctxSize / 1000)}k${RST}`
    }
    out.push(s)
  }

  if (!compact) {
    if (added !== '' || removed !== '') out.push(`${OKG}+${added || 0}${RST} ${BAD}-${removed || 0}${RST}`)
    const secs = durMs !== '' ? Math.floor(durMs / 1000) : ''
    let s = ''
    if (secs !== '') s = `${DIM}⏱ ${fmtDur(secs)}${RST}`
    if (cost !== '') {
      s += `${s ? ' ' : ''}${DIM}💰 $${cost.toFixed(2)}${RST}`
      if (secs !== '' && secs >= 300) s += ` ${DIM}($${(cost / (secs / 3600)).toFixed(2)}/h)${RST}`
    }
    if (s) out.push(s)
    if (ver) out.push(`${DIM}v${ver}${RST}`)
  }

  return out.join(SEP)
}

if (require.main === module) {
  let raw = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', d => (raw += d))
  process.stdin.on('end', () => {
    try { process.stdout.write(main(raw)) } catch {}
  })
} else {
  module.exports = { main }
}
