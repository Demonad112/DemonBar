import { expect, test } from 'claude-code/testing'

const run = ($: any, args: string) =>
  $.command.run({ command: 'demonbar', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })

test('/demonbar <profile> runs the CLI `use` and asks for a restart', async ($, on) => {
  const calls: string[][] = []
  on('process.run', ($, e) => {
    calls.push([...e.argv])
    return { value: { exitCode: 0, stdout: "now using 'Demonad'.", stderr: '' } as never }
  })

  const out = await run($, 'Demonad')

  expect(calls).toHaveLength(1)
  expect(calls[0][0]).toBe('node')
  expect(calls[0][1]).toMatch(/bin\/demonbar\.js$/)
  expect(calls[0].slice(2, 4)).toEqual(['use', 'Demonad'])
  expect(out.text).toContain("now using 'Demonad'")
  expect(out.text).toContain('Restart Claude Code')
})

test('/demonbar with no argument lists profiles and does not ask for a restart', async ($, on) => {
  const calls: string[][] = []
  on('process.run', ($, e) => {
    calls.push([...e.argv])
    return { value: { exitCode: 0, stdout: '* Demon\n  Demonad', stderr: '' } as never }
  })

  const out = await run($, '')

  expect(calls[0][2]).toBe('list')
  expect(out.text).toContain('Demonad')
  expect(out.text).not.toContain('Restart')
})

test('/demonbar status and revert pass through to the CLI', async ($, on) => {
  const calls: string[][] = []
  on('process.run', ($, e) => {
    calls.push([...e.argv])
    return { value: { exitCode: 0, stdout: 'ok', stderr: '' } as never }
  })

  await run($, 'status')
  await run($, 'revert')

  expect(calls.map(c => c[2])).toEqual(['status', 'revert'])
})
