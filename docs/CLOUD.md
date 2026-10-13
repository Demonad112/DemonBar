# DemonBar in the cloud (Claude Code on the web, Codespaces, CI boxes)

A cloud session is a fresh container: `~/.claude` starts empty and is thrown away with the container. Install DemonBar
on each new container with one command and it behaves like the local install.

## Option A: environment setup script (recommended)
In the cloud environment settings, add a **setup script**:

```bash
npx -y github:Demonad112/DemonBar install --profile Demon
```

or pick the look per environment with `--profile Demonad`. The same thing, idempotent and quiet when already present:

```bash
curl -fsSL https://raw.githubusercontent.com/Demonad112/DemonBar/main/scripts/cloud-setup.sh | DEMONBAR_PROFILE=Demonad bash
```

Setup scripts run before Claude Code starts, so the plugin folders and `statusLine` are read on launch.
`/demonbar list`, `/demonbar Demonad` and `/demonbar status` work inside the session; a switch needs a restart or `/reload-plugins`.

## Option B: SessionStart hook (installs on first use; applies from the next session)
Put this in a repository's `.claude/settings.json` so every cloud session of that repo installs DemonBar once:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "npx -y github:Demonad112/DemonBar install --profile Demon" } ] }
    ]
  }
}
```

The settings written by `install` live in the user-level `~/.claude/settings.json` (`CLAUDE_CODE_PLUGIN_DIRS` is never
read from a project's settings), so the first session that runs the hook only prepares the files; the look appears from the
next session on the same container. Use option A when you want it from the first message.

## Notes
- Needs Node 18+ and `bash` (both present in the standard cloud image). `jq` is not needed.
- The `ccstatusline` row backend is installed with `npm install -g ccstatusline`; if the network policy blocks npm, DemonBar falls back to its built-in row automatically.
- Allow `registry.npmjs.org` and `github.com` in the environment's network policy for the install.
- Cloud containers are disposable: `revert` is rarely needed, but works the same way.
