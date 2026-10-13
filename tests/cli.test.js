'use strict'
// CLI tests. Every test runs against a throwaway home (HOME/USERPROFILE), never the real ~/.claude.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { spawnSync } = require('child_process')

const CLI = path.resolve(__dirname, '..', 'bin', 'demonbar.js')
const SAMPLE = path.resolve(__dirname, '..', 'scripts', 'sample-input.json')

const scratch = () => fs.mkdtempSync(path.join(os.tmpdir(), 'demonbar-test-'))
const run = (home, args) =>
  spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, DEMONBAR_SKIP_NPM: '1' },
  })
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
function snapshot(home) {
  const out = {}
  const walk = d => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n)
      if (p === path.join(home, '.claude', 'demonbar')) continue
      fs.statSync(p).isDirectory() ? walk(p) : (out[path.relative(home, p)] = sha(p))
    }
  }
  walk(home)
  return out
}
function seedHome(home) {
  fs.mkdirSync(path.join(home, '.claude', 'plugins', 'store'), { recursive: true })
  fs.mkdirSync(path.join(home, '.config', 'ccstatusline'), { recursive: true })
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'),
    JSON.stringify({ theme: 'dark', env: { FOO: '1', CLAUDE_CODE_PLUGIN_DIRS: '/other/plugin' }, statusLine: { type: 'command', command: 'echo old' }, enabledPlugins: { 'skins@local-desktop-app-uploads': true, 'x@y': true } }) + '\n')
  fs.writeFileSync(path.join(home, '.config', 'ccstatusline', 'settings.json'), '{"old":true}\n')
  fs.writeFileSync(path.join(home, '.claude', 'plugins', 'store', 'skins_abc.json'), '{"prefs":{"skin":"noir"}}')
}
const settings = home => JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'))

test('install on a fresh machine, then revert removes everything it created', () => {
  const home = scratch()
  assert.strictEqual(run(home, ['install']).status, 0)
  const s = settings(home)
  assert.match(s.statusLine.command, /demonbar\/plugins\/demonbar\/bin\/statusline-switch\.sh$/)
  const dirs = s.env.CLAUDE_CODE_PLUGIN_DIRS.split(path.delimiter)
  assert.strictEqual(dirs.length, 2)
  assert.ok(fs.existsSync(path.join(home, '.claude', 'demonbar', 'plugins', 'demonbar-skins', 'hooks', 'seed.ts')))
  assert.ok(fs.existsSync(path.join(home, '.config', 'ccstatusline', 'settings.json')))
  assert.strictEqual(run(home, ['revert']).status, 0)
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'settings.json')))
  assert.ok(!fs.existsSync(path.join(home, '.config', 'ccstatusline', 'settings.json')))
})

test('install -> use Demonad -> status -> revert restores original bytes', () => {
  const home = scratch()
  seedHome(home)
  const before = snapshot(home)
  assert.strictEqual(run(home, ['install', '--profile', 'Demon']).status, 0)

  const s = settings(home)
  assert.strictEqual(s.theme, 'dark')
  assert.strictEqual(s.env.FOO, '1')
  assert.ok(s.env.CLAUDE_CODE_PLUGIN_DIRS.startsWith('/other/plugin' + path.delimiter))
  assert.ok(!('skins@local-desktop-app-uploads' in s.enabledPlugins))
  assert.strictEqual(s.enabledPlugins['x@y'], true)

  const kit = path.join(home, '.claude', 'demonbar')
  const backups = fs.readdirSync(path.join(kit, 'backup'))
  assert.strictEqual(backups.length, 1)
  const manifest = JSON.parse(fs.readFileSync(path.join(kit, 'backup', backups[0], 'manifest.json'), 'utf8'))
  assert.strictEqual(manifest.files.length, 3)
  assert.ok(manifest.files.every(f => f.existed && f.sha256))

  assert.strictEqual(run(home, ['use', 'Demonad']).status, 0)
  assert.match(fs.readFileSync(path.join(kit, 'plugins', 'demonbar', 'hooks', 'theme.ts'), 'utf8'), /./)
  assert.notStrictEqual(sha(path.join(kit, 'plugins', 'demonbar', 'hooks', 'theme.ts')), sha(path.join(kit, 'profiles', 'Demon', 'theme.ts')))
  assert.strictEqual(sha(path.join(kit, 'plugins', 'demonbar', 'hooks', 'theme.ts')), sha(path.join(kit, 'profiles', 'Demonad', 'theme.ts')))
  assert.match(fs.readFileSync(path.join(home, '.claude', 'plugins', 'store', 'skins_abc.json'), 'utf8'), /"skin": ?"demonad"/)

  const st = run(home, ['status'])
  assert.match(st.stdout, /profile\s+: Demonad/)
  assert.match(st.stdout, /statusLine : DemonBar/)
  assert.match(st.stdout, /conflicts : none/)

  assert.strictEqual(run(home, ['revert']).status, 0)
  assert.deepStrictEqual(snapshot(home), before)
})

test('install is idempotent: no duplicate entries, one backup, same settings', () => {
  const home = scratch()
  seedHome(home)
  run(home, ['install'])
  const first = fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8')
  run(home, ['install'])
  run(home, ['install'])
  assert.strictEqual(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'), first)
  assert.strictEqual(fs.readdirSync(path.join(home, '.claude', 'demonbar', 'backup')).length, 1)
  const before = JSON.stringify(settings(home).env.CLAUDE_CODE_PLUGIN_DIRS.split(path.delimiter))
  assert.strictEqual(JSON.parse(before).filter(d => /demonbar$/.test(d)).length, 1)
  // revert after repeated installs still returns the very first state
  const orig = scratch(); seedHome(orig)
  assert.strictEqual(run(home, ['revert']).status, 0)
  assert.deepStrictEqual(snapshot(home), snapshot(orig))
})

test('revert after settings.json was edited removes only DemonBar lines', () => {
  const home = scratch()
  seedHome(home)
  run(home, ['install'])
  const f = path.join(home, '.claude', 'settings.json')
  const s = settings(home)
  s.model = 'opus'
  fs.writeFileSync(f, JSON.stringify(s, null, 2))
  assert.strictEqual(run(home, ['revert']).status, 0)
  const r = settings(home)
  assert.strictEqual(r.model, 'opus')
  assert.deepStrictEqual(r.statusLine, { type: 'command', command: 'echo old' })
  assert.strictEqual(r.env.CLAUDE_CODE_PLUGIN_DIRS, '/other/plugin')
  assert.strictEqual(r.enabledPlugins['skins@local-desktop-app-uploads'], true)
})

test('a broken settings.json aborts install and changes nothing', () => {
  const home = scratch()
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), '{ not json')
  const r = run(home, ['install'])
  assert.notStrictEqual(r.status, 0)
  assert.strictEqual(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'), '{ not json')
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'demonbar')))
})

test('setup (plugin route) wires statusLine but not plugin dirs', () => {
  const home = scratch()
  assert.strictEqual(run(home, ['setup']).status, 0)
  const s = settings(home)
  assert.ok(s.statusLine.command.includes('statusline-switch.sh'))
  assert.ok(!(s.env && s.env.CLAUDE_CODE_PLUGIN_DIRS))
})

test('status flags conflicts: old statusbar/skins entries and claude-usage-statusline', () => {
  const home = scratch()
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({
    env: { CLAUDE_CODE_PLUGIN_DIRS: ['C:/x/statusbar-kit/statusbar', 'C:/x/plugins/skins'].join(path.delimiter) },
    enabledPlugins: { 'claude-usage-statusline@claude-ai': true, 'skins@m': true },
  }))
  const out = run(home, ['status']).stdout
  assert.match(out, /claude-usage-statusline@claude-ai is enabled/)
  assert.match(out, /skins@m is enabled/)
  assert.match(out, /old plugin dir/)
})

test('unknown profile is refused', () => {
  const home = scratch()
  const r = run(home, ['install', '--profile', 'Nope'])
  assert.notStrictEqual(r.status, 0)
  assert.match(r.stderr, /unknown profile/)
})

test('uninstall reverts and removes the kit but keeps backups', () => {
  const home = scratch()
  seedHome(home)
  const before = snapshot(home)
  run(home, ['install'])
  assert.strictEqual(run(home, ['uninstall']).status, 0)
  assert.deepStrictEqual(snapshot(home), before)
  const kit = path.join(home, '.claude', 'demonbar')
  assert.deepStrictEqual(fs.readdirSync(kit), ['backup'])
})

test('dispatcher renders the sample input in both profiles (Node path, no jq)', () => {
  const home = scratch()
  run(home, ['install'])
  const sw = path.join(home, '.claude', 'demonbar', 'plugins', 'demonbar', 'bin', 'statusline-switch.sh')
  const input = fs.readFileSync(SAMPLE, 'utf8')
  for (const profile of ['Demon', 'Demonad']) {
    run(home, ['use', profile])
    const r = spawnSync('bash', [sw], { input, encoding: 'utf8', env: { ...process.env, HOME: home, STATUSLINE_COLS: '160', PATH: path.dirname(process.execPath) + path.delimiter + '/usr/bin' + path.delimiter + '/bin' } })
    assert.strictEqual(r.status, 0)
    assert.match(r.stdout, /Sonnet 5\.5/)
    assert.match(r.stdout, /5h/)
    assert.match(r.stdout, /ctx/)
  }
})

test('the repo plugin files carry the Demon profile (what the marketplace route ships)', () => {
  const root = path.resolve(__dirname, '..')
  const same = (a, b) => sha(path.join(root, a)) === sha(path.join(root, b))
  assert.ok(same('plugins/demonbar/hooks/theme.ts', 'profiles/Demon/theme.ts'))
  assert.ok(same('plugins/demonbar-skins/hooks/rows.tsx', 'profiles/Demon/skins-overrides/rows.tsx'))
  assert.ok(same('plugins/demonbar-skins/hooks/register.tsx', 'plugins/demonbar-skins/skins-register-patch.tsx'))
  assert.strictEqual(fs.readFileSync(path.join(root, 'plugins/demonbar/bin/active-profile.txt'), 'utf8').trim(), 'demonbar')
})

test('install works when the package sits inside a node_modules folder (npx layout)', () => {
  const home = scratch()
  const pkg = path.join(scratch(), 'node_modules', 'demonbar')
  fs.mkdirSync(pkg, { recursive: true })
  const root = path.resolve(__dirname, '..')
  for (const n of ['bin', 'plugins', 'profiles', 'scripts', 'package.json', 'LICENSE']) fs.cpSync(path.join(root, n), path.join(pkg, n), { recursive: true })
  const r = spawnSync(process.execPath, [path.join(pkg, 'bin', 'demonbar.js'), 'install', '--profile', 'Demonad'], {
    encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, DEMONBAR_SKIP_NPM: '1' },
  })
  assert.strictEqual(r.status, 0, r.stderr)
  assert.ok(fs.existsSync(path.join(home, '.claude', 'demonbar', 'plugins', 'demonbar', 'hooks', 'register.tsx')))
  assert.ok(fs.existsSync(path.join(home, '.claude', 'demonbar', 'profiles', 'Demonad', 'theme.ts')))
})
