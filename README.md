# DemonBar

Demon (red) and Demonad (blue) look for Claude Code: status band above the prompt, spinner, reply footer, panes, tool rows,
message bubble and code/table cards, plus a status-line row. Install in one line, switch profiles with a slash command,
revert whenever.

## Install

**Any OS (Node 18+, git, bash):**
```
npx -y github:Demonad112/DemonBar install
```
Blue look: add `--profile Demonad`.

**Windows one-liner (PowerShell):**
```
irm https://raw.githubusercontent.com/Demonad112/DemonBar/main/install.ps1 | iex
```
It checks Node, Git and Git Bash, installs nothing silently, then runs the command above. Pick the look first with
`$env:DEMONBAR_PROFILE = 'Demonad'`.

**Plugin route (Demon theme only):**
```
/plugin marketplace add Demonad112/DemonBar
/plugin install demonbar@demonbar
/plugin install demonbar-skins@demonbar
```
then, once, for what a plugin cannot set (statusLine, row config, skins seed):
```
npx -y github:Demonad112/DemonBar setup
```
Use `install` instead if you want Demonad or profile switching: the theme files live inside the loaded plugin folder, and only `install` keeps that folder under the CLI's control.

**Cloud (Claude Code on the web, Codespaces):** see [docs/CLOUD.md](docs/CLOUD.md). Setup script: `npx -y github:Demonad112/DemonBar install --profile Demon`.

Then fully quit and reopen Claude Code and send a message.

## Switch profile (slash command)
```
/demonbar list           # profiles, * = active
/demonbar Demonad        # or Demon  (same as /demonbar use Demonad)
/demonbar status         # what is wired, conflicts
/demonbar revert         # restore the files install changed
```
Restart Claude Code (or `/reload-plugins`) after a switch. The same from a shell: `npx -y github:Demonad112/DemonBar use Demonad`
or `node ~/.claude/demonbar/bin/demonbar.js use Demonad`.

Other commands the kit adds: `/skin` (skin settings, `/skin gallery`), `/spinner` (cycle spinner style),
`/usage-pane`, `/changes`, `/calls` (panes). `!refine` in a prompt makes Claude write a brief first and wait for your go.

## What you get
- **Status band** above the prompt: 5h shield, context and weekly gauges with reset times, burn rate and empty-by ETA, last-turn time and tool count, Compact and Remember buttons, skull indicator.
- **Status-line row** (ccstatusline): model, effort, session cost and rate, Claude status, git branch and diff, working directory.
- **Spinner** with usage, words, sweep or orbit styles; **reply footer** with duration and cost; **tool rows** with timings.
- **Skins** (patched copy of [hellosverre/claude-skins](https://github.com/hellosverre/claude-skins), MIT): right-aligned bubble for your messages, bordered code and table cards with a Copy button, themed spinner words.
- **Built-in status line fallback** (`statusline.js`, Node, no `jq`) used when `ccstatusline` is not installed.

## Prerequisites (checked and explained, never installed silently)
| Need | Why | Install |
|---|---|---|
| Node 18+ | the CLI and the built-in status line | `winget install OpenJS.NodeJS.LTS`, `brew install node` |
| bash | Claude Code runs the status-line command through it | Windows: Git Bash, `winget install Git.Git` |
| git | `npx github:...` fetches the repo | `winget install Git.Git` |
| `ccstatusline` (npm) | the status-line row; `install` runs `npm install -g ccstatusline` if missing, skip with `--no-backend` | `npm i -g ccstatusline` |

`jq` is only needed for the legacy `plugins/demonbar/bin/statusline.sh`; the Node port replaces it.

## Keep the old things off
- The claude.ai account plugin **`claude-usage-statusline` must stay disabled**: it rewrites `statusLine` every session and removes the DemonBar line.
- Do not also install the `skins` plugin from a marketplace, and drop any old `statusbar` / `skins` entries from `CLAUDE_CODE_PLUGIN_DIRS`. `install` removes known duplicate `enabledPlugins` entries (backed up); `demonbar status` reports what remains.

## Revert
```
npx -y github:Demonad112/DemonBar revert
```
Every file `install` changes is backed up first to `~/.claude/demonbar/backup/<timestamp>/` with a manifest. Details and the by-hand procedure: [RESTORE.md](RESTORE.md).
Re-running `install` never duplicates settings entries.

## What `install` changes
| File | Change |
|---|---|
| `~/.claude/demonbar/` | the kit (CLI, plugins, profiles) |
| `~/.claude/settings.json` | `statusLine` and DemonBar folders added to `env.CLAUDE_CODE_PLUGIN_DIRS` (existing keys and other folders kept) |
| `~/.config/ccstatusline/settings.json` | row layout of the active profile |
| `~/.claude/plugins/store/skins_*.json` | skins preferences, only if the file exists (otherwise the built-in seed applies) |

## Layout
| Path | What |
|---|---|
| `bin/demonbar.js` | CLI: install, setup, use, list, status, revert, uninstall |
| `plugins/demonbar/` | mod: band, spinner, footer, panes, tool rows, `/demonbar`; `bin/` has the status-line dispatcher |
| `plugins/demonbar-skins/` | skins plugin with the DemonBar patch and `hooks/seed.ts` defaults |
| `profiles/Demon`, `profiles/Demonad` | theme, row layout, skins store, bubble/card overrides |
| `.claude-plugin/marketplace.json` | plugin route |
| `install.ps1`, `scripts/` | Windows bootstrapper, cloud setup, verification, sample input |
| `tests/`, `docs/` | CLI tests, notes ([TESTS.md](docs/TESTS.md), [CLOUD.md](docs/CLOUD.md)) |
| `RENAMES.md` | planned renames (not applied yet) |

Edit a look in `profiles/<name>/` and run `use` again: edits made directly to the installed `theme.ts` or skins files are overwritten.

## Develop
```
node --test tests/cli.test.js
claude plugin validate .            # marketplace + both plugins
claude plugin test plugins/demonbar
claude plugin test plugins/demonbar-skins
bash scripts/verify.sh              # everything above in scratch homes + secret scan
```
Tests run against throwaway homes; nothing touches your real `~/.claude`.

## License
MIT. `plugins/demonbar-skins` is derived from hellosverre/claude-skins (MIT); see [LICENSE](LICENSE).
