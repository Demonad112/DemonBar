// Pure helpers for the band: no session access, so any file can import them.

export const BAR_WIDTH = 8
export const NAMES: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

// Segmented ▰▱ bar; returns [filled, track] so each can be coloured separately.
export const segBar = (pct: number, width = BAR_WIDTH): [string, string] => {
  const n = Math.round((Math.max(0, Math.min(100, pct)) / 100) * width)
  return ['▰'.repeat(n), '▱'.repeat(width - n)]
}

// Narrow window (about 390px is ~50 cells): shorter bars, no clock or ETA.
export const NARROW_COLS = 70
export const termCols = () => {
  try {
    return (globalThis as { process?: { stdout?: { columns?: number } } }).process?.stdout?.columns ?? 0
  } catch {
    return 0
  }
}

export const until = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

export const clock = (ms: number) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const shortModel = (m: string) =>
  m
    .replace(/^claude-/, '')
    .replace(/-(\d+)-(\d+)$/, ' $1.$2')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

// eslint-disable-next-line no-control-regex
export const ANSI = /\u001b\[[0-9;?]*[A-Za-z]|\u001b\][^\u0007]*\u0007/g

const BASIC = ['#000000', '#cd3131', '#0dbc79', '#e5e510', '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5']
const BRIGHT = ['#666666', '#f14c4c', '#23d18b', '#f5f543', '#3b8eea', '#d670d6', '#29b8db', '#ffffff']

const xterm = (n: number) => {
  if (n < 8) return BASIC[n]
  if (n < 16) return BRIGHT[n - 8]
  if (n >= 232) {
    const v = 8 + (n - 232) * 10
    return '#' + [v, v, v].map(x => x.toString(16).padStart(2, '0')).join('')
  }
  const k = n - 16
  const lv = [0, 95, 135, 175, 215, 255]
  return '#' + [lv[Math.floor(k / 36)], lv[Math.floor(k / 6) % 6], lv[k % 6]].map(x => x.toString(16).padStart(2, '0')).join('')
}

export type Seg = { text: string; fg?: string; bg?: string; bold?: boolean; dim?: boolean }

// Splits one line of SGR-coloured text into styled segments.
export const parseAnsi = (line: string): Seg[] => {
  const out: Seg[] = []
  let st: Omit<Seg, 'text'> = {}
  let last = 0
  const re = /\u001b\[([0-9;]*)m/g
  const push = (text: string) => text && out.push({ text, ...st })
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    push(line.slice(last, m.index))
    last = re.lastIndex
    const p = m[1] === '' ? [0] : m[1].split(';').map(Number)
    for (let i = 0; i < p.length; i++) {
      const c = p[i]
      if (c === 0) st = {}
      else if (c === 1) st = { ...st, bold: true }
      else if (c === 2) st = { ...st, dim: true }
      else if (c === 22) st = { ...st, bold: false, dim: false }
      else if (c === 39) st = { ...st, fg: undefined }
      else if (c === 49) st = { ...st, bg: undefined }
      else if ((c >= 30 && c <= 37) || (c >= 90 && c <= 97)) st = { ...st, fg: c < 90 ? BASIC[c - 30] : BRIGHT[c - 90] }
      else if ((c >= 40 && c <= 47) || (c >= 100 && c <= 107)) st = { ...st, bg: c < 100 ? BASIC[c - 40] : BRIGHT[c - 100] }
      else if (c === 38 || c === 48) {
        let col: string | undefined
        if (p[i + 1] === 5) { col = xterm(p[i + 2]); i += 2 }
        else if (p[i + 1] === 2) { col = '#' + [p[i + 2], p[i + 3], p[i + 4]].map(x => x.toString(16).padStart(2, '0')).join(''); i += 4 }
        st = c === 38 ? { ...st, fg: col } : { ...st, bg: col }
      }
    }
  }
  push(line.slice(last))
  return out
}

// The status lines of `git status --short --branch` and `git diff --shortstat HEAD`, as the Changes pane shows them.
export const gitInfo = (status: string, diff: string) => {
  const [head, ...files] = status.split('\n').filter(Boolean)
  return { state: 'ok' as const, branch: head.replace(/^## /, ''), stat: diff.trim(), files }
}
