import type { EngineInterface, Register } from 'claude-code'

// /demonbar [list | status | <profile> | use <profile> | revert]
// Runs the DemonBar CLI (bin/demonbar.js two folders above this plugin once installed to ~/.claude/demonbar).
// Registration of the command itself happens in register.tsx (session.start belongs to that file).
export const COMMAND = {
  name: 'demonbar',
  description: 'Switch the DemonBar look: /demonbar list | status | Demon | Demonad | revert',
  argumentHint: '[list | status | Demon | Demonad | use <name> | revert]',
}

// The CLI sits two folders above this plugin in ~/.claude/demonbar; a marketplace-installed copy has no CLI
// beside it, so the home install is tried next.
async function cliCandidates($: EngineInterface): Promise<string[]> {
  const list = [`${$.plugin.root.replace(/\\/g, '/').replace(/\/+$/, '')}/../../bin/demonbar.js`]
  try {
    const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE'))
    if (home) list.push(`${String(home).replace(/\\/g, '/')}/.claude/demonbar/bin/demonbar.js`)
  } catch {}

  return list
}

export const register: Register = on => {
  on('command.run', { command: 'demonbar' }, async ($, e) => {
    const words = e.args.trim().split(/\s+/).filter(Boolean)
    let argv = words
    if (words.length === 0) argv = ['list']
    else if (words[0] === 'use') argv = words
    else if (!['list', 'status', 'revert', 'current'].includes(words[0])) argv = ['use', words[0]]

    try {
      let r: { exitCode: number; stdout: string; stderr: string } | undefined
      for (const cli of await cliCandidates($)) {
        r = await $.process.run(['node', cli, ...argv, '--from-claude'], { timeoutMs: 60000 })
        if (!/Cannot find module/.test(r.stderr)) break
      }
      if (!r) throw new Error('no DemonBar CLI found')
      const out = (r.stdout + (r.stderr ? '\n' + r.stderr : '')).trim()
      const tail = r.exitCode === 0 && argv[0] !== 'list' && argv[0] !== 'status' ? '\nRestart Claude Code (or /reload-plugins) to apply.' : ''

      return { text: (out || `demonbar exited ${r.exitCode}`) + tail }
    } catch (err) {
      return { text: `demonbar: could not run node (${err instanceof Error ? err.message : String(err)}). Install Node 18+.` }
    }
  })
}
