import { atom, read } from 'claude-code'
import type { Register } from 'claude-code'

import type { Footer } from '../types'
import { THEME as T } from './theme'

const footersAtom = atom({ plugin: 'demonbar', key: 'footers' } as const, [] as Footer[])

// Footers are stored in register.tsx at turn.complete and matched to the reply's final text block,
// which is the turn's `answer`. The skins plugin owns the "my message" bubble, so this does not touch UserMessage.
const secs = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m${Math.round(s % 60)}s` : `${s.toFixed(1)}s`)

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const list = await read($, footersAtom)
    const tail = (s: string) => s.replace(/\s+/g, ' ').trim().slice(-60)
    const mine = tail(e.props.text)
    const hit = mine ? [...list].reverse().find(f => tail(f.text) === mine) : undefined
    if (!hit) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const cost = hit.usd === null ? '' : ` · $${hit.usd.toFixed(hit.usd < 0.1 ? 3 : 2)}`

    return (
      <Box flexDirection="column">
        {await next(e)}
        <Text color={T.footer} dimColor>
          ⏱ {secs(hit.seconds)}
          {cost}
        </Text>
      </Box>
    )
  })
}
