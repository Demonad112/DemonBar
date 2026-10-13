# RENAMES: planned old -> new names

Nothing in this repo is renamed yet. The copy matches what was tested locally, so a rename is a separate,
mechanical pass the owner applies in GitHub at push time. Line numbers below were generated from the tree at
build time (`grep -rnE <pattern>`); re-run the listed search to refresh them after edits.

## Summary

| # | Old | New | Scope |
|---|---|---|---|
| 1 | status-line row backend value `ccstatusline` | `demonbar` | `active-profile.txt` value, `backend.txt` of each profile, dispatcher, `register.tsx` check, CLI. **Not** the npm package `ccstatusline` or the `ccstatusline` command it calls, and not `ccstatusline.json` (the config file ccstatusline itself reads from `~/.config/ccstatusline/settings.json`; the profile source file may be renamed to `row.json` if wanted). The npm package stays a documented dependency. |
| 2 | mod plugin `statusbar` | `demonbar` | `plugin.json` name, `PluginState` key in `types/index.d.ts`, every `plugin: 'statusbar'` atom, slash commands, store namespace |
| 3 | skins plugin `skins` (patched copy of hellosverre/claude-skins, MIT) | `demonbar-skins` | `plugin.json` name, atom plugin id, tool `mcp__skins__design`, store files `skins_*.json`, `/skin` command, `types/index.d.ts` state key. Keep `LICENSE` and the upstream attribution. Skin names `demon` / `demonad` stay. |
| 4 | `active-profile.txt` | `active-backend.txt` | file name + the 4 readers |
| 5 | `statusline-switch.sh` | `demonbar-line.sh` | file name + settings command + `register.tsx` + CLI |
| 6 | `profile.sh` | (removed) | already replaced by `bin/demonbar.js`; only the kit docs mentioned it |
| 7 | `CLAUDE_CODE_PLUGIN_DIRS` | unchanged | the app's own env name |

Rename order that avoids a broken intermediate state: 4 and 5 first (files and their readers together), then 1,
then 2, then 3. After each: `node --test tests/cli.test.js`, `claude plugin validate .`,
`claude plugin test plugins/demonbar`, `claude plugin test plugins/demonbar-skins`.

Places a plain search-and-replace would damage:
- `ccstatusline` as the npm package / command (`npm install -g ccstatusline`, `command -v ccstatusline`, `ccstatusline` piped in the dispatcher) must stay; only the backend *value* changes.
- `skins` inside `$.store` keys is a data migration: existing `~/.claude/plugins/store/skins_*.json` files are matched by the CLI (`/^skins_.*\.json$/`); update that pattern together with the plugin rename.
- `statusbar` inside user prose ("status bar") is not an identifier.
- The marketplace entry names are already `demonbar` and `demonbar-skins` (so `/plugin install demonbar@demonbar` works today); only the `plugin.json` names differ.

## 1. Backend value `ccstatusline` -> `demonbar`





Search: `ccstatusline`

| File | Line | Text |
|---|---|---|
| `profiles/Demonad/backend.txt` | 1 | `ccstatusline` |
| `profiles/Demon/backend.txt` | 1 | `ccstatusline` |
| `plugins/demonbar/hooks/register.tsx` | 67 | `// When active-profile.txt names ccstatusline, run the dispatcher with a status-line` |
| `plugins/demonbar/hooks/register.tsx` | 72 | `if (p.stdout.trim() !== 'ccstatusline') return undefined` |
| `plugins/demonbar/hooks/register.tsx` | 369 | `// Flat: every gauge in one wrapping row, then the ccstatusline line.` |
| `plugins/demonbar/hooks/register.tsx` | 381 | `// Rows: skull column on the left; shield on row 1, context/weekly/last turn on row 2, then the ccstatusline l` |
| `plugins/demonbar/hooks/theme-types.ts` | 16 | `// 'rows' = skull column and stacked rows; 'flat' = one wrapping row of gauges, then the ccstatusline line.` |
| `plugins/demonbar/bin/active-profile.txt` | 1 | `ccstatusline` |
| `plugins/demonbar/bin/statusline-switch.sh` | 4 | `#   ccstatusline  -> ccstatusline with its config (~/.config/ccstatusline/settings.json)` |
| `plugins/demonbar/bin/statusline-switch.sh` | 5 | `# Anything unknown, or a missing ccstatusline install, falls back to custom. Never prints errors.` |
| `plugins/demonbar/bin/statusline-switch.sh` | 29 | `if [ "$profile" = "ccstatusline" ] && command -v ccstatusline >/dev/null 2>&1; then` |
| `plugins/demonbar/bin/statusline-switch.sh` | 30 | `printf '%s' "$input" \| ccstatusline 2>/dev/null` |
| `bin/demonbar.js` | 28 | `ccs: path.join(home, '.config', 'ccstatusline', 'settings.json'),` |
| `bin/demonbar.js` | 63 | `if (fs.existsSync(path.join(d, 'ccstatusline.json'))) t.push(P.ccs)` |
| `bin/demonbar.js` | 171 | `const c = path.join(d, 'ccstatusline.json')` |
| `bin/demonbar.js` | 187 | `if (backendName === 'ccstatusline') {` |
| `bin/demonbar.js` | 188 | `const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ccstatusline'], { stdio: 'ignore' })` |
| `bin/demonbar.js` | 189 | `if (r.status !== 0) notes.push('ccstatusline (npm package, the status-line row backend) not found.')` |
| `bin/demonbar.js` | 196 | `log('installing ccstatusline (npm install -g ccstatusline)...')` |
| `bin/demonbar.js` | 197 | `const r = spawnSync(npm, ['install', '-g', 'ccstatusline'], { stdio: 'inherit' })` |
| `bin/demonbar.js` | 198 | `if (r.error \|\| r.status !== 0) warn('could not install ccstatusline; the status line falls back to the built-i` |
| `bin/demonbar.js` | 224 | `if (backend === 'ccstatusline' && !opts.noBackend && notes.some(n => n.startsWith('ccstatusline'))) {` |
| `bin/demonbar.js` | 273 | `log('row backend: ${backend \|\| '(unknown)'}${backend === 'ccstatusline' ? '' : ''}')` |
| `bin/demonbar.js` | 274 | `log('ccstatusline config: ${fs.existsSync(P.ccs) ? P.ccs : 'missing'}')` |
| `bin/demonbar.js` | 294 | `const cc = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ccstatusline'], { stdio: 'ignore' })` |
| `bin/demonbar.js` | 295 | `log('ccstatusline: ${cc.status === 0 ? 'on PATH' : 'not on PATH (only needed for the ccstatusline row backend)` |

## 2. Mod plugin `statusbar` -> `demonbar`





Search: `statusbar`

| File | Line | Text |
|---|---|---|
| `plugins/demonbar/types/index.d.ts` | 22 | `statusbar: {` |
| `plugins/demonbar/hooks/register.tsx` | 16 | `const snapAtom = atom({ plugin: 'statusbar', key: 'snap' } as const, null)` |
| `plugins/demonbar/hooks/register.tsx` | 17 | `const tickAtom = atom({ plugin: 'statusbar', key: 'tick' } as const, 0)` |
| `plugins/demonbar/hooks/register.tsx` | 18 | `const callsAtom = atom({ plugin: 'statusbar', key: 'calls' } as const, [] as Call[])` |
| `plugins/demonbar/hooks/register.tsx` | 20 | `{ plugin: 'statusbar', key: 'git' } as const,` |
| `plugins/demonbar/hooks/register.tsx` | 23 | `const footersAtom = atom({ plugin: 'statusbar', key: 'footers' } as const, [] as Footer[])` |
| `plugins/demonbar/hooks/register.tsx` | 24 | `const costAtStartAtom = atom({ plugin: 'statusbar', key: 'costAtStart' } as const, null as number \| null)` |
| `plugins/demonbar/hooks/panes.tsx` | 8 | `const tickAtom = atom({ plugin: 'statusbar', key: 'tick' } as const, 0)` |
| `plugins/demonbar/hooks/panes.tsx` | 9 | `const callsAtom = atom({ plugin: 'statusbar', key: 'calls' } as const, [] as Call[])` |
| `plugins/demonbar/hooks/panes.tsx` | 11 | `{ plugin: 'statusbar', key: 'git' } as const,` |
| `plugins/demonbar/hooks/msg-chrome.tsx` | 7 | `const footersAtom = atom({ plugin: 'statusbar', key: 'footers' } as const, [] as Footer[])` |
| `plugins/demonbar/.claude-plugin/plugin.json` | 2 | `"name": "statusbar",` |
| `plugins/demonbar-skins/hooks/register.tsx` | 344 | `// Status-Bar patch: with 'rail' off, tool rows are left to the statusbar mod's tool-rows.` |
| `plugins/demonbar-skins/hooks/register.tsx` | 452 | `// Status-Bar patch: with 'shimmer' off, the spinner is left to the statusbar mod's spinner.` |
| `plugins/demonbar-skins/hooks/register.tsx` | 481 | `// Status-Bar patch: with 'rail' off, the turn footer is the statusbar mod's reply footer.` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 344 | `// Status-Bar patch: with 'rail' off, tool rows are left to the statusbar mod's tool-rows.` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 452 | `// Status-Bar patch: with 'shimmer' off, the spinner is left to the statusbar mod's spinner.` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 481 | `// Status-Bar patch: with 'rail' off, the turn footer is the statusbar mod's reply footer.` |
| `bin/demonbar.js` | 143 | `// the skins plugin loads from its folder here; an installed copy (or the old statusbar entries) would load tw` |
| `bin/demonbar.js` | 146 | `if (/^skins@/.test(k) \|\| /^statusbar@/.test(k) \|\| /^demonbar(-skins)?@/.test(k)) {` |
| `bin/demonbar.js` | 282 | `if (/^statusbar@/.test(k) && ep[k]) conflicts.push('${k} is enabled: duplicates the DemonBar mod.')` |
| `bin/demonbar.js` | 286 | `if (/[\\/](statusbar-kit\|statusbar)([\\/]\|$)/.test(d)) conflicts.push('old plugin dir in CLAUDE_CODE_PLUGIN_DI` |

## 3. Skins plugin `skins` -> `demonbar-skins`

Only identifiers and paths; prose mentions of "skins" and the skin gallery text can follow.





Search: `plugin: 'skins'|"skins"|mcp__skins__|skins_|skins@|/skin\b|'skin'|"name": "skins"`

| File | Line | Text |
|---|---|---|
| `profiles/Demonad/skins-overrides/svg-code.ts` | 1 | `import type { Palette } from './skin'` |
| `profiles/Demonad/skins-overrides/svg-table.ts` | 2 | `import type { Palette } from './skin'` |
| `profiles/Demonad/skins-overrides/svg-kit.ts` | 1 | `import type { Palette } from './skin'` |
| `profiles/Demonad/skins-overrides/rows.tsx` | 7 | `import type { Icons, Kind, Skin } from './skin'` |
| `profiles/Demon/skins-overrides/svg-code.ts` | 1 | `import type { Palette } from './skin'` |
| `profiles/Demon/skins-overrides/svg-table.ts` | 2 | `import type { Palette } from './skin'` |
| `profiles/Demon/skins-overrides/svg-kit.ts` | 1 | `import type { Palette } from './skin'` |
| `profiles/Demon/skins-overrides/rows.tsx` | 7 | `import type { Icons, Kind, Skin } from './skin'` |
| `plugins/demonbar-skins/types/index.d.ts` | 20 | `// What /skin and the settings pane change. 'skin' is a skin's name, or 'off'.` |
| `plugins/demonbar-skins/skills/skin-designer/SKILL.md` | 9 | `zebra rows, a shimmering spinner and a turn footer. It gives you one tool, 'mcp__skins__design', and` |
| `plugins/demonbar-skins/skills/skin-designer/SKILL.md` | 20 | `4. Tell them what you changed in one line, and that '/skin' opens the settings to fine-tune it.` |
| `plugins/demonbar-skins/hooks/register.tsx` | 16 | `import { ICONS } from './skin'` |
| `plugins/demonbar-skins/hooks/register.tsx` | 17 | `import type { Skin } from './skin'` |
| `plugins/demonbar-skins/hooks/register.tsx` | 27 | `const DESIGN = 'mcp__skins__${DESIGN_TOOL.name}'` |
| `plugins/demonbar-skins/hooks/register.tsx` | 28 | `const DESIGN_MATCH = /^mcp__skins__design$/` |
| `plugins/demonbar-skins/hooks/register.tsx` | 40 | `const prefsAtom = atom({ plugin: 'skins', key: 'prefs' } as const, DEFAULT_PREFS)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 41 | `const customAtom = atom({ plugin: 'skins', key: 'custom' } as const, {})` |
| `plugins/demonbar-skins/hooks/register.tsx` | 42 | `const startedAtom = atom({ plugin: 'skins', key: 'startedAt' } as const, 0)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 43 | `const frameAtom = atom({ plugin: 'skins', key: 'frame' } as const, 0)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 44 | `const turnsAtom = atom({ plugin: 'skins', key: 'turns' } as const, {})` |
| `plugins/demonbar-skins/hooks/register.tsx` | 45 | `const durationAtom = atom({ plugin: 'skins', key: 'duration' } as const, -1)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 46 | `const editingAtom = atom({ plugin: 'skins', key: 'editing' } as const, 'user' as SkinSlot)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 47 | `const lightAtom = atom({ plugin: 'skins', key: 'isLight' } as const, false)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 48 | `const imagesAtom = atom({ plugin: 'skins', key: 'images' } as const, false)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 49 | `const usageAtom = atom({ plugin: 'skins', key: 'usage' } as const, { context: null, limits: [] } as UsageSnap)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 50 | `const compactingAtom = atom({ plugin: 'skins', key: 'compacting' } as const, false)` |
| `plugins/demonbar-skins/hooks/register.tsx` | 141 | `// The width the last reply was drawn at, shown by /skin list to tune table sizing.` |
| `plugins/demonbar-skins/hooks/register.tsx` | 146 | `name: 'skin',` |
| `plugins/demonbar-skins/hooks/register.tsx` | 147 | `description: 'Open the skin settings, or /skin <name \| list \| off>',` |
| `plugins/demonbar-skins/hooks/register.tsx` | 261 | `on('command.run', { command: 'skin' }, async ($, e) => {` |
| `plugins/demonbar-skins/hooks/register.tsx` | 334 | `return <ui.Text>The gallery shows a skin. Pick one with /skin first.</ui.Text>` |
| `plugins/demonbar-skins/hooks/svg-code.ts` | 1 | `import type { Palette } from './skin'` |
| `plugins/demonbar-skins/hooks/command.ts` | 13 | `// The on/off settings, by the word /skin and the settings pane use for each.` |
| `plugins/demonbar-skins/hooks/command.ts` | 75 | `// Every argument but none: with none, /skin opens the settings pane instead.` |
| `plugins/demonbar-skins/hooks/command.ts` | 84 | `: refused(current, 'usage: /skin ${head} on\|off')` |
| `plugins/demonbar-skins/hooks/command.ts` | 102 | `: refused(current, 'usage: /skin icons unicode\|ascii')` |
| `plugins/demonbar-skins/hooks/command.ts` | 106 | `: refused(current, 'unknown skin "${head}". /skin list shows them')` |
| `plugins/demonbar-skins/hooks/light.ts` | 1 | `import type { Palette, Skin } from './skin'` |
| `plugins/demonbar-skins/hooks/themes/gruvbox.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/mono.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/index.ts` | 10 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/neon-dusk.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/demon-dusk.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/catppuccin.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/noir.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/nord.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/dracula.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/themes/tokyo-night.ts` | 1 | `import type { Skin } from '../skin'` |
| `plugins/demonbar-skins/hooks/svg-table.ts` | 2 | `import type { Palette } from './skin'` |
| `plugins/demonbar-skins/hooks/svg-usage.ts` | 2 | `import type { Palette } from './skin'` |
| `plugins/demonbar-skins/hooks/svg-kit.ts` | 1 | `import type { Palette } from './skin'` |
| `plugins/demonbar-skins/hooks/tools.ts` | 2 | `import type { ToolKind } from './skin'` |
| `plugins/demonbar-skins/hooks/svg-diff.ts` | 1 | `import type { Palette } from './skin'` |
| `plugins/demonbar-skins/hooks/icons.ts` | 1 | `import type { Kind } from './skin'` |
| `plugins/demonbar-skins/hooks/rows.tsx` | 7 | `import type { Icons, Kind, Skin } from './skin'` |
| `plugins/demonbar-skins/hooks/custom.ts` | 2 | `import type { Skin } from './skin'` |
| `plugins/demonbar-skins/hooks/svg-terminal.ts` | 1 | `import type { Palette } from './skin'` |
| `plugins/demonbar-skins/.claude-plugin/plugin.json` | 2 | `"name": "skins",` |
| `plugins/demonbar-skins/.claude-plugin/plugin.json` | 4 | `"description": "Skins for Claude Code's transcript: themed tool rows, reply gutters and spinner words. /skin s` |
| `plugins/demonbar-skins/README.md` | 9 | `<img alt="The same Claude Code turn switching skins with /skin: noir, Tokyo Night, Dracula, Catppuccin" src="d` |
| `plugins/demonbar-skins/README.md` | 44 | `/plugin install skins@hellosverre-mods` |
| `plugins/demonbar-skins/README.md` | 69 | `- **'/skin'** opens the settings: pick a skin, see a live preview, switch the rail, tables, shimmer,` |
| `plugins/demonbar-skins/README.md` | 71 | `- **'/skin gallery'** shows every element the skin draws, numbered, to point at when you want one changed.` |
| `plugins/demonbar-skins/README.md` | 74 | `- **'/skin <name>'**, '/skin list', '/skin off', and '/skin rail\|tables\|shimmer\|band\|clip on\|off' for quick sw` |
| `plugins/demonbar-skins/scripts/previews.ts` | 10 | `import type { Kind, Palette } from '../hooks/skin'` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 16 | `import { ICONS } from './skin'` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 17 | `import type { Skin } from './skin'` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 27 | `const DESIGN = 'mcp__skins__${DESIGN_TOOL.name}'` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 28 | `const DESIGN_MATCH = /^mcp__skins__design$/` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 40 | `const prefsAtom = atom({ plugin: 'skins', key: 'prefs' } as const, DEFAULT_PREFS)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 41 | `const customAtom = atom({ plugin: 'skins', key: 'custom' } as const, {})` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 42 | `const startedAtom = atom({ plugin: 'skins', key: 'startedAt' } as const, 0)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 43 | `const frameAtom = atom({ plugin: 'skins', key: 'frame' } as const, 0)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 44 | `const turnsAtom = atom({ plugin: 'skins', key: 'turns' } as const, {})` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 45 | `const durationAtom = atom({ plugin: 'skins', key: 'duration' } as const, -1)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 46 | `const editingAtom = atom({ plugin: 'skins', key: 'editing' } as const, 'user' as SkinSlot)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 47 | `const lightAtom = atom({ plugin: 'skins', key: 'isLight' } as const, false)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 48 | `const imagesAtom = atom({ plugin: 'skins', key: 'images' } as const, false)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 49 | `const usageAtom = atom({ plugin: 'skins', key: 'usage' } as const, { context: null, limits: [] } as UsageSnap)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 50 | `const compactingAtom = atom({ plugin: 'skins', key: 'compacting' } as const, false)` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 141 | `// The width the last reply was drawn at, shown by /skin list to tune table sizing.` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 146 | `name: 'skin',` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 147 | `description: 'Open the skin settings, or /skin <name \| list \| off>',` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 261 | `on('command.run', { command: 'skin' }, async ($, e) => {` |
| `plugins/demonbar-skins/skins-register-patch.tsx` | 334 | `return <ui.Text>The gallery shows a skin. Pick one with /skin first.</ui.Text>` |
| `bin/demonbar.js` | 56 | `try { return fs.readdirSync(P.store).filter(n => /^skins_.*\.json$/.test(n)).map(n => path.join(P.store, n)) }` |
| `bin/demonbar.js` | 146 | `if (/^skins@/.test(k) \|\| /^statusbar@/.test(k) \|\| /^demonbar(-skins)?@/.test(k)) {` |
| `bin/demonbar.js` | 281 | `if (/^skins@/.test(k) && ep[k]) conflicts.push('${k} is enabled: DemonBar loads its own skins copy; two would ` |

## 4. `active-profile.txt` -> `active-backend.txt`





Search: `active-profile`

| File | Line | Text |
|---|---|---|
| `plugins/demonbar/hooks/register.tsx` | 59 | `// The dispatcher, statusline.sh and active-profile.txt ship inside the plugin, under bin/.` |
| `plugins/demonbar/hooks/register.tsx` | 67 | `// When active-profile.txt names ccstatusline, run the dispatcher with a status-line` |
| `plugins/demonbar/hooks/register.tsx` | 71 | `const p = await runBash($, ['-c','/usr/bin/tr -d '[:space:]' < "${binPath($, 'active-profile.txt')}"'], { time` |
| `plugins/demonbar/bin/statusline-switch.sh` | 2 | `# Status line dispatcher: picks the backend named in active-profile.txt.` |
| `plugins/demonbar/bin/statusline-switch.sh` | 26 | `profile=$(tr -d '[:space:]' < "$DIR/active-profile.txt" 2>/dev/null)` |
| `bin/demonbar.js` | 75 | `if (fs.existsSync(path.join(d, 'backend.txt'))) cp(path.join(d, 'backend.txt'), path.join(mod, 'bin', 'active-` |
| `bin/demonbar.js` | 76 | `else writeFile(path.join(mod, 'bin', 'active-profile.txt'), 'custom\n')` |
| `bin/demonbar.js` | 222 | `const backend = fs.readFileSync(path.join(root, MOD, 'bin', 'active-profile.txt'), 'utf8').trim()` |
| `bin/demonbar.js` | 272 | `const backend = (readIf(path.join(P.kit, MOD, 'bin', 'active-profile.txt')) \|\| '').toString().trim()` |

## 5. `statusline-switch.sh` -> `demonbar-line.sh`





Search: `statusline-switch`

| File | Line | Text |
|---|---|---|
| `plugins/demonbar/hooks/register.tsx` | 96 | `const r = await runBash($, [binPath($, 'statusline-switch.sh')],{ stdin: JSON.stringify(input), timeoutMs: 100` |
| `bin/demonbar.js` | 120 | `const command = 'bash ${fwd(path.join(P.kit, MOD, 'bin', 'statusline-switch.sh'))}'` |

## 6. `profile.sh`

No file remains; the kit's `profile.sh use <name>` is `demonbar use <name>` / `/demonbar <name>`.

