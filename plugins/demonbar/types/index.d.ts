export type Meter = { label: string; pct: number; reset?: string; resetAt?: string; rate?: number; eta?: string }
export type Snap = { model?: string; meters: Meter[]; ctx?: number; cost?: number; raw?: string }

export type Call = {
  id: string
  tool: string
  startedAt: number
  ms: number | null
}

export type GitInfo = {
  state: 'unknown' | 'none' | 'ok'
  branch: string
  stat: string
  files: string[]
}

export type Footer = { text: string; seconds: number; usd: number | null }

declare module 'claude-code' {
  interface PluginState {
    demonbar: {
      snap: Snap | null
      tick: number
      calls: Call[]
      git: GitInfo
      footers: Footer[]
      costAtStart: number | null
    }
  }
}
