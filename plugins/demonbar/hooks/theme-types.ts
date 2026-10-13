// The shape of hooks/theme.ts. Each profile supplies its own theme.ts; the mod code is shared.
export type Theme = {
  name: string
  // Status band colours. good/mid/low/crit step as a bar drains; num is the readable colour for a good bar's percentage.
  band: {
    good: string
    num: string
    mid: string
    low: string
    crit: string
    muted: string
    track: string
    sep: string
  }
  labels: { shield: string; ctx: string; week: string }
  // 'rows' = skull column and stacked rows; 'flat' = one wrapping row of gauges, then the ccstatusline line.
  layout: 'rows' | 'flat'
  // Emoji skull states for the band and spinner; null uses `glyph` instead.
  skull: { idle: string; low: string; work: [string, string] } | null
  glyph: string
  spinner: {
    // Replaces the engine's word per spinner mode; null leaves the engine's word.
    words: Record<string, string> | null
    bar: [string, string]
    // 'left' shows remaining (100 - used) under the label, 'used' shows used.
    usage: { label: string; mode: 'left' | 'used' }
  }
  footer: string
  panes: { low: string; mid: string; hi: string; accent: string }
}
