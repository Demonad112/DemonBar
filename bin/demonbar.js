#!/usr/bin/env node
'use strict'
// DemonBar CLI. Node 18+, no dependencies.
//   demonbar install [--profile Demon|Demonad] [--no-backend]   (kit folders loaded via CLAUDE_CODE_PLUGIN_DIRS)
//   demonbar setup   [--profile ...]   (after `/plugin install demonbar@demonbar`: statusLine, row config, skins seed only)
//   demonbar use <profile> | list | current | status | revert | uninstall [--purge]
// Every file install changes is backed up first to ~/.claude/demonbar/backup/<timestamp>/ with a manifest.
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { spawnSync } = require('child_process')

const PKG_ROOT = path.resolve(__dirname, '..')
const MOD = 'plugins/demonbar'
const SKINS = 'plugins/demonbar-skins'
const COPY = ['bin', 'plugins', 'profiles', 'scripts', 'package.json', 'LICENSE', 'README.md', 'RESTORE.md', 'RENAMES.md']
const DEFAULT_PROFILE = 'Demon'

// ---------- paths (resolved per call so tests can change HOME) ----------
function paths() {
  const home = os.homedir()
  const claude = path.join(home, '.claude')
  const kit = path.join(claude, 'demonbar')
  return {
    home, claude, kit,
    settings: path.join(claude, 'settings.json'),
    ccs: path.join(home, '.config', 'ccstatusline', 'settings.json'),
    store: path.join(claude, 'plugins', 'store'),
    backups: path.join(kit, 'backup'),
    state: path.join(kit, 'state.json'),
  }
}
const fwd = p => p.replace(/\\/g, '/')
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex')
const readIf = f => { try { return fs.readFileSync(f) } catch { return null } }
const log = (...a) => console.log(...a)
const warn = (...a) => console.error('warn:', ...a)
class Fail extends Error {}
const die = m => { throw new Fail(m) }
const writeFile = (f, data) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data) }

function readJson(f, fallback) {
  const b = readIf(f)
  if (b === null) return fallback
  try { return JSON.parse(b.toString('utf8').replace(/^﻿/, '')) } catch (e) { die(`${f} is not valid JSON (${e.message}). Fix it or move it aside; nothing was changed.`) }
}

// ---------- profiles ----------
function listProfiles(root) {
  const d = path.join(root, 'profiles')
  return fs.existsSync(d) ? fs.readdirSync(d).filter(n => fs.statSync(path.join(d, n)).isDirectory()).sort() : []
}

function skinsStoreFiles(P) {
  try { return fs.readdirSync(P.store).filter(n => /^skins_.*\.json$/.test(n)).map(n => path.join(P.store, n)) } catch { return [] }
}

// Files a profile writes outside the kit (these get backed up).
function externalTargets(P, root, name) {
  const d = path.join(root, 'profiles', name)
  const t = []
  if (fs.existsSync(path.join(d, 'ccstatusline.json'))) t.push(P.ccs)
  if (fs.existsSync(path.join(d, 'store', 'skins.json'))) t.push(...skinsStoreFiles(P))
  return t
}

// Copy a profile's files into the kit folder `root` (theme, backend, skins seed, bubble/card overrides).
// Returns the config to write outside the kit: { ccs, storeFiles } as [from, to] pairs.
function applyKit(root, name) {
  const d = path.join(root, 'profiles', name)
  if (!fs.existsSync(d)) die(`no profile '${name}' (have: ${listProfiles(root).join(', ') || 'none'})`)
  const mod = path.join(root, MOD), skins = path.join(root, SKINS, 'hooks')
  const cp = (a, b) => fs.copyFileSync(a, b)
  if (fs.existsSync(path.join(d, 'backend.txt'))) cp(path.join(d, 'backend.txt'), path.join(mod, 'bin', 'active-profile.txt'))
  else writeFile(path.join(mod, 'bin', 'active-profile.txt'), 'custom\n')
  if (fs.existsSync(path.join(d, 'theme.ts'))) cp(path.join(d, 'theme.ts'), path.join(mod, 'hooks', 'theme.ts'))
  const skinsJson = path.join(d, 'store', 'skins.json')
  if (fs.existsSync(skinsJson)) {
    const compact = JSON.stringify(JSON.parse(fs.readFileSync(skinsJson, 'utf8')))
    writeFile(path.join(skins, 'seed.ts'),
      `// Default prefs and custom skins, used until the plugin has a store file of its own.\nexport const SEED_STORE: { custom?: unknown; prefs?: unknown } = ${compact}\n`)
  }
  const patch = path.join(root, SKINS, 'skins-register-patch.tsx')
  if (fs.existsSync(patch)) cp(patch, path.join(skins, 'register.tsx'))
  const ov = path.join(d, 'skins-overrides')
  if (fs.existsSync(ov)) for (const f of fs.readdirSync(ov)) cp(path.join(ov, f), path.join(skins, f))
  writeFile(path.join(root, 'current-profile.txt'), name + '\n')
}

// ---------- backup ----------
function loadState(P) { return readJson(P.state, null) }

function openBackup(P, state) {
  if (state && state.backupId && fs.existsSync(path.join(P.backups, state.backupId, 'manifest.json'))) {
    const dir = path.join(P.backups, state.backupId)
    return { id: state.backupId, dir, manifest: readJson(path.join(dir, 'manifest.json')) }
  }
  const id = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(P.backups, id)
  fs.mkdirSync(dir, { recursive: true })
  return { id, dir, manifest: { version: 1, created: new Date().toISOString(), files: [], settings: null, reverted: false } }
}

// Capture a file once per backup (the first capture is the original).
function capture(bk, file) {
  if (bk.manifest.files.some(f => f.path === file)) return
  const b = readIf(file)
  const entry = { path: file, existed: b !== null }
  if (b !== null) { entry.backup = String(bk.manifest.files.length) + '.bak'; fs.writeFileSync(path.join(bk.dir, entry.backup), b); entry.sha256 = sha(b) }
  bk.manifest.files.push(entry)
}
const saveManifest = bk => fs.writeFileSync(path.join(bk.dir, 'manifest.json'), JSON.stringify(bk.manifest, null, 2) + '\n')

// ---------- settings merge ----------
function wireSettings(P, bk, withPlugins) {
  const s = readJson(P.settings, {})
  if (typeof s !== 'object' || s === null || Array.isArray(s)) die(`${P.settings} is not a JSON object; nothing was changed.`)
  const mod = fwd(path.join(P.kit, MOD)), skins = fwd(path.join(P.kit, SKINS))
  const command = `bash ${fwd(path.join(P.kit, MOD, 'bin', 'statusline-switch.sh'))}`

  // what was there before, kept once so revert can put it back
  if (!bk.manifest.settings) {
    bk.manifest.settings = {
      hadStatusLine: 'statusLine' in s, statusLine: s.statusLine,
      hadEnv: 'env' in s, hadPluginDirs: !!(s.env && 'CLAUDE_CODE_PLUGIN_DIRS' in s.env), pluginDirs: s.env && s.env.CLAUDE_CODE_PLUGIN_DIRS,
      removedPlugins: {},
    }
  }
  const prevLine = s.statusLine
  s.statusLine = { type: 'command', command, padding: 0 }
  if (prevLine && prevLine.command && prevLine.command !== command && !isOurs(prevLine.command)) {
    log(`note: replacing existing statusLine (${prevLine.command}); revert restores it.`)
  }

  // `setup` (plugin route) leaves plugin loading to the marketplace install; `install` loads the kit folders.
  if (withPlugins) {
    s.env = s.env && typeof s.env === 'object' ? s.env : {}
    const keep = String(s.env.CLAUDE_CODE_PLUGIN_DIRS || '').split(path.delimiter).filter(x => x && !isOurs(x))
    s.env.CLAUDE_CODE_PLUGIN_DIRS = [...keep, mod, skins].join(path.delimiter)
  }

  // the skins plugin loads from its folder here; an installed copy (or the old statusbar entries) would load twice
  if (withPlugins && s.enabledPlugins && typeof s.enabledPlugins === 'object') {
    for (const k of Object.keys(s.enabledPlugins)) {
      if (/^skins@/.test(k) || /^statusbar@/.test(k) || /^demonbar(-skins)?@/.test(k)) {
        bk.manifest.settings.removedPlugins[k] = bk.manifest.settings.removedPlugins[k] ?? s.enabledPlugins[k]
        delete s.enabledPlugins[k]
      }
    }
  }
  const out = JSON.stringify(s, null, 2) + '\n'
  writeFile(P.settings, out)
  bk.manifest.settings.writtenSha256 = sha(Buffer.from(out))
}
const isOurs = x => /[\\/]\.claude[\\/]demonbar([\\/]|$)/.test(String(x)) || /demonbar/i.test(String(x))

// ---------- commands ----------
function copyKit(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const n of COPY) {
    const from = path.join(src, n)
    if (!fs.existsSync(from)) continue
    fs.rmSync(path.join(dest, n), { recursive: true, force: true })
    fs.cpSync(from, path.join(dest, n), { recursive: true, filter: s => !/(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(path.relative(src, s)) }) // relative: the package itself usually sits inside a node_modules folder
  }
}

function writeExternal(P, root, name) {
  const d = path.join(root, 'profiles', name)
  const c = path.join(d, 'ccstatusline.json')
  if (fs.existsSync(c)) writeFile(P.ccs, fs.readFileSync(c))
  const sj = path.join(d, 'store', 'skins.json')
  if (fs.existsSync(sj)) for (const f of skinsStoreFiles(P)) fs.copyFileSync(sj, f)
}

function checkPrereqs(backendName) {
  const notes = []
  const nodeMajor = Number(process.versions.node.split('.')[0])
  if (nodeMajor < 18) die(`Node 18+ required (have ${process.versions.node}).`)
  const bash = spawnSync('bash', ['--version'], { stdio: 'ignore' })
  if (bash.error || bash.status !== 0) {
    notes.push(process.platform === 'win32'
      ? 'Git Bash not found on PATH. The status line runs through bash: install Git for Windows (winget install Git.Git), then re-run install.'
      : 'bash not found on PATH; the status line command needs it.')
  }
  if (backendName === 'ccstatusline') {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ccstatusline'], { stdio: 'ignore' })
    if (r.status !== 0) notes.push('ccstatusline (npm package, the status-line row backend) not found.')
  }
  return notes
}

function installBackend() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  log('installing ccstatusline (npm install -g ccstatusline)...')
  const r = spawnSync(npm, ['install', '-g', 'ccstatusline'], { stdio: 'inherit' })
  if (r.error || r.status !== 0) warn('could not install ccstatusline; the status line falls back to the built-in row. Run: npm install -g ccstatusline')
}

function cmdInstall(opts) {
  const P = paths()
  const name = opts.profile || DEFAULT_PROFILE
  if (!listProfiles(PKG_ROOT).includes(name)) die(`unknown profile '${name}' (have: ${listProfiles(PKG_ROOT).join(', ')})`)
  readJson(P.settings, {}) // fail early on a broken settings.json, before anything changes

  const bk = openBackup(P, loadState(P))
  if (path.resolve(PKG_ROOT) !== path.resolve(P.kit)) {
    // keep the backup folder while refreshing the kit
    copyKit(PKG_ROOT, P.kit)
  }
  const root = P.kit
  for (const f of [P.settings, P.ccs, ...skinsStoreFiles(P)]) capture(bk, f)
  applyKit(root, name)
  writeExternal(P, root, name)
  wireSettings(P, bk, !opts.pluginRoute)
  for (const e of bk.manifest.files) if (fs.existsSync(e.path)) e.writtenSha256 = sha(fs.readFileSync(e.path))
  bk.manifest.reverted = false
  saveManifest(bk)
  writeFile(P.state, JSON.stringify({ profile: name, backupId: bk.id, installedAt: new Date().toISOString() }, null, 2) + '\n')

  const backend = fs.readFileSync(path.join(root, MOD, 'bin', 'active-profile.txt'), 'utf8').trim()
  const notes = checkPrereqs(backend)
  if (backend === 'ccstatusline' && !opts.noBackend && notes.some(n => n.startsWith('ccstatusline'))) {
    if (process.env.DEMONBAR_SKIP_NPM === '1') notes.push('(DEMONBAR_SKIP_NPM=1: skipped npm install)')
    else { installBackend(); }
  }
  log(`installed profile '${name}' to ${P.kit}`)
  log(`backup: ${bk.dir}`)
  for (const n of notes) warn(n)
  log('Next: fully quit and reopen Claude Code, then use /demonbar list | /demonbar Demonad.')
  log('Keep the claude.ai account plugin "claude-usage-statusline" disabled (it rewrites statusLine each session).')
}

function cmdUse(name) {
  const P = paths()
  if (!fs.existsSync(path.join(P.kit, 'profiles'))) die('DemonBar is not installed. Run: npx -y github:<owner>/DemonBar install')
  if (!name) die('usage: demonbar use <profile>')
  const list = listProfiles(P.kit)
  const real = list.find(n => n.toLowerCase() === name.toLowerCase())
  if (!real) die(`no profile '${name}' (have: ${list.join(', ')})`)
  const st = loadState(P)
  const bk = openBackup(P, st)
  for (const f of [P.ccs, ...skinsStoreFiles(P)]) capture(bk, f) // no-op when already captured at install
  applyKit(P.kit, real)
  writeExternal(P, P.kit, real)
  saveManifest(bk)
  writeFile(P.state, JSON.stringify({ ...(st || {}), profile: real, backupId: bk.id }, null, 2) + '\n')
  log(`now using '${real}'. Restart Claude Code (or /reload-plugins).`)
}

function cmdList() {
  const P = paths()
  const root = fs.existsSync(path.join(P.kit, 'profiles')) ? P.kit : PKG_ROOT
  const st = loadState(P)
  for (const n of listProfiles(root)) log(`${st && st.profile === n ? '*' : ' '} ${n}`)
}

function cmdStatus() {
  const P = paths()
  const st = loadState(P)
  const installed = fs.existsSync(path.join(P.kit, 'profiles'))
  log(`installed : ${installed ? 'yes' : 'no'}  (${P.kit})`)
  log(`profile   : ${st ? st.profile : '(none)'}`)
  const s = readJson(P.settings, {})
  const sl = s.statusLine && s.statusLine.command
  const dirs = String((s.env && s.env.CLAUDE_CODE_PLUGIN_DIRS) || '').split(path.delimiter).filter(Boolean)
  const dirsOurs = dirs.filter(isOurs)
  log(`settings  : ${P.settings}`)
  log(`  statusLine : ${sl ? (isOurs(sl) ? 'DemonBar' : 'OTHER: ' + sl) : 'not set'}`)
  log(`  plugin dirs: ${dirsOurs.length ? dirsOurs.join(', ') : 'DemonBar not listed'}`)
  const backend = (readIf(path.join(P.kit, MOD, 'bin', 'active-profile.txt')) || '').toString().trim()
  log(`row backend: ${backend || '(unknown)'}${backend === 'ccstatusline' ? '' : ''}`)
  log(`ccstatusline config: ${fs.existsSync(P.ccs) ? P.ccs : 'missing'}`)
  log(`backup    : ${st && st.backupId ? path.join(P.backups, st.backupId) : '(none)'}`)
  // conflicts
  const conflicts = []
  const ep = s.enabledPlugins || {}
  for (const k of Object.keys(ep)) {
    if (/^claude-usage-statusline@/.test(k) && ep[k]) conflicts.push(`${k} is enabled: it rewrites statusLine each session. Disable it.`)
    if (/^skins@/.test(k) && ep[k]) conflicts.push(`${k} is enabled: DemonBar loads its own skins copy; two would load.`)
    if (/^statusbar@/.test(k) && ep[k]) conflicts.push(`${k} is enabled: duplicates the DemonBar mod.`)
  }
  for (const d of dirs) {
    if (isOurs(d)) continue
    if (/[\\/](statusbar-kit|statusbar)([\\/]|$)/.test(d)) conflicts.push(`old plugin dir in CLAUDE_CODE_PLUGIN_DIRS: ${d}`)
    if (/[\\/]skins([\\/]|$)/.test(d)) conflicts.push(`old skins plugin dir in CLAUDE_CODE_PLUGIN_DIRS: ${d}`)
  }
  if (sl && !isOurs(sl)) conflicts.push(`statusLine points elsewhere: ${sl}`)
  log(conflicts.length ? 'conflicts :\n  - ' + conflicts.join('\n  - ') : 'conflicts : none')
  const bash = spawnSync('bash', ['--version'], { stdio: 'ignore' })
  log(`bash      : ${bash.error || bash.status !== 0 ? 'NOT FOUND (install Git Bash on Windows)' : 'ok'}`)
  log(`node      : ${process.versions.node}`)
  const cc = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ccstatusline'], { stdio: 'ignore' })
  log(`ccstatusline: ${cc.status === 0 ? 'on PATH' : 'not on PATH (only needed for the ccstatusline row backend)'}`)
}

function cmdRevert() {
  const P = paths()
  const st = loadState(P)
  let id = st && st.backupId
  if (!id || !fs.existsSync(path.join(P.backups, id, 'manifest.json'))) {
    const all = fs.existsSync(P.backups) ? fs.readdirSync(P.backups).filter(n => fs.existsSync(path.join(P.backups, n, 'manifest.json'))).sort() : []
    id = all[all.length - 1]
  }
  if (!id) die('no backup found; nothing to revert.')
  const dir = path.join(P.backups, id)
  const m = readJson(path.join(dir, 'manifest.json'))
  for (const e of m.files) {
    const isSettings = path.resolve(e.path) === path.resolve(P.settings)
    if (isSettings && m.settings) {
      const cur = readIf(e.path)
      if (cur !== null && sha(cur) !== m.settings.writtenSha256) { surgicalSettings(P, m.settings); continue }
    }
    if (e.existed) { writeFile(e.path, fs.readFileSync(path.join(dir, e.backup))) } else { fs.rmSync(e.path, { force: true }) }
  }
  m.reverted = true
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n')
  fs.rmSync(P.state, { force: true })
  log(`reverted from ${dir}. Restart Claude Code.`)
}

// settings.json was edited after install: undo only DemonBar's lines.
function surgicalSettings(P, prev) {
  const s = readJson(P.settings, {})
  if (s.statusLine && isOurs(s.statusLine.command)) {
    if (prev.hadStatusLine) s.statusLine = prev.statusLine; else delete s.statusLine
  }
  if (s.env) {
    const keep = String(s.env.CLAUDE_CODE_PLUGIN_DIRS || '').split(path.delimiter).filter(x => x && !isOurs(x))
    if (keep.length) s.env.CLAUDE_CODE_PLUGIN_DIRS = keep.join(path.delimiter); else delete s.env.CLAUDE_CODE_PLUGIN_DIRS
    if (!Object.keys(s.env).length && !prev.hadEnv) delete s.env
  }
  if (prev.removedPlugins && Object.keys(prev.removedPlugins).length) {
    s.enabledPlugins = { ...(s.enabledPlugins || {}), ...prev.removedPlugins }
  }
  writeFile(P.settings, JSON.stringify(s, null, 2) + '\n')
  log('settings.json changed since install: removed only DemonBar lines.')
}

function cmdUninstall(opts) {
  const P = paths()
  if (fs.existsSync(P.state) || fs.existsSync(P.backups)) cmdRevert()
  if (opts.purge) fs.rmSync(P.kit, { recursive: true, force: true })
  else if (fs.existsSync(P.kit)) for (const n of fs.readdirSync(P.kit)) if (n !== 'backup') fs.rmSync(path.join(P.kit, n), { recursive: true, force: true })
  log(`uninstalled${opts.purge ? ' (backups removed)' : ' (backups kept in ' + P.backups + ')'}`)
}

// ---------- main ----------
function parse(argv) {
  const o = { _: [], profile: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--profile' || a === '-p') o.profile = argv[++i]
    else if (a.startsWith('--profile=')) o.profile = a.slice(10)
    else if (a === '--no-backend') o.noBackend = true
    else if (a === '--purge') o.purge = true
    else if (a === '--from-claude') o.fromClaude = true
    else if (a === '-h' || a === '--help') o.help = true
    else o._.push(a)
  }
  return o
}

const HELP = `demonbar - Demon (red) / Demonad (blue) status band for Claude Code
  install [--profile Demon|Demonad] [--no-backend]   copy the kit to ~/.claude/demonbar and wire settings.json
  setup [--profile ...]   plugin route: statusLine + row config + skins seed only (plugins come from /plugin install)
  use <profile>     switch look (also: /demonbar <profile> inside Claude Code)
  list | current    show profiles
  status            show what is wired and any conflicts
  revert            restore the files install changed
  uninstall [--purge]`

function main(argv) {
  const o = parse(argv)
  const cmd = o._[0]
  try {
    switch (cmd) {
      case 'install': cmdInstall(o); break
      case 'setup': cmdInstall({ ...o, pluginRoute: true }); break
      case 'use': cmdUse(o._[1] || o.profile); break
      case 'list': cmdList(); break
      case 'current': log((loadState(paths()) || {}).profile || '(none)'); break
      case 'status': cmdStatus(); break
      case 'revert': cmdRevert(); break
      case 'uninstall': cmdUninstall(o); break
      default: console.log(HELP); return o.help || !cmd ? 0 : 1
    }
    return 0
  } catch (e) {
    if (e instanceof Fail) { console.error('demonbar: ' + e.message); return 1 }
    throw e
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2))
module.exports = { main, applyKit, listProfiles }
