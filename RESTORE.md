# Restore / rollback

`install` backs up every file it will change before touching it, into
`~/.claude/demonbar/backup/<timestamp>/` with a `manifest.json` (path, whether it existed, SHA-256 before and after).
Files covered: `~/.claude/settings.json`, `~/.config/ccstatusline/settings.json`, `~/.claude/plugins/store/skins_*.json`.
Running `install`/`use` again does not create a second baseline: the first backup stays the original.

## Undo everything

```
npx -y github:Demonad112/DemonBar revert        # or: node ~/.claude/demonbar/bin/demonbar.js revert
```

- Files that existed are restored byte for byte; files DemonBar created are deleted.
- If `settings.json` was edited after install, it is not overwritten: only the DemonBar `statusLine`, the DemonBar entries in `env.CLAUDE_CODE_PLUGIN_DIRS`, and the plugin entries install removed are put back as they were.
- Then fully quit and reopen Claude Code.

`uninstall` = `revert` + delete `~/.claude/demonbar/` except `backup/`. `uninstall --purge` deletes the backups too.

## By hand (CLI unusable)
1. Quit Claude Code.
2. Open the newest folder in `~/.claude/demonbar/backup/`. `manifest.json` lists each original file as `N.bak` with its target path.
3. Copy each `N.bak` over its target path (for entries with `"existed": false`, delete the target).
4. If you only want the look gone: delete the `statusLine` key and the DemonBar paths from `env.CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`.

## The old kit
Earlier installs from `statusbar-kit` wrote `settings.json.bak-statusbar-kit` and a `~/.claude/statusbar-kit` folder. `demonbar status`
flags leftover `statusbar` / `skins` entries; remove them from `CLAUDE_CODE_PLUGIN_DIRS` so nothing loads twice.
