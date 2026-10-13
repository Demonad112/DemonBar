import type { Register } from 'claude-code'

// icon + color per tool; anything unlisted gets the default
const STYLE: Record<string, { icon: string; color: string }> = {
  Bash: { icon: '⚡', color: '#af5fff' },
  Read: { icon: '📖', color: '#5fafff' },
  Edit: { icon: '✏️', color: '#d787ff' },
  Write: { icon: '📝', color: '#d787ff' },
  Grep: { icon: '🔎', color: '#5fd7ff' },
  Glob: { icon: '🗂️', color: '#5fd7ff' },
  Agent: { icon: '🤖', color: '#ff5fd7' },
  Task: { icon: '🤖', color: '#ff5fd7' },
  WebFetch: { icon: '🌐', color: '#5f87ff' },
  WebSearch: { icon: '🌐', color: '#5f87ff' },
}
const DEFAULT = { icon: '🔧', color: '#8787ff' }

export const register: Register = on => {
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const p = e.props
    const { Box, Text } = $.ui.resolve(e)
    const s = STYLE[p.tool] ?? DEFAULT

    // state wins over tool icon so failures and running calls stand out
    const mark = p.isErrored ? '❌' : p.isInterrupted ? '⛔' : p.isRunning ? '⏳' : s.icon
    const color = p.isErrored ? '#ff5f5f' : s.color

    return (
      <Box>
        <Text color={color}>{mark} </Text>
        {await next(e)}
      </Box>
    )
  })
}
