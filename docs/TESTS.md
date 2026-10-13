# Test notes

## claude plugin validate
`claude plugin validate .` (marketplace + both plugins) passes. The remaining output is advice only (gating hooks without `.catch`, a README install line for the skins plugin).

## claude plugin test plugins/demonbar-skins: 49/49
The kit as received (`statusbar-kit.zip`) failed 7 of 49 tests. Causes, all investigated:

| Failing test | Cause | Resolution |
|---|---|---|
| band offers Compact, nudges at 70% | test harness had no `config.list` answer; `session.start` hook was skipped | tests: `config.list` stub added to `stubEngine` |
| light Claude Code theme | same missing `config.list` (the test's own override was fine once the hook ran) | same stub, `stubEngine(on, 'light')` |
| typed prompt outline | DemonBar patch: bubble is right-aligned with a `double` border | expectations updated (`flex-end`, `double`) |
| reply with a table | patched terminal table is a bordered card of Text rows; it also **dropped the header row** (a patch regression) | **code fix**: `tableRows` now draws the header row (`hooks/rows.tsx` and both profile overrides); test updated to the card structure |
| code fence on desktop | patched code card is Box/Text with a Copy overlay, not an Svg | test updated |
| Copy button overlay | card is `width: 100%`, overlay is the absolute child | test updated |
| settings pane picks a skin | with the rail off (the DemonBar default) the terminal keeps Claude Code's own tool row | test updated; also starts a session first so state is loaded |

Profile-seeded prefs (demon skin, rail off, band off) no longer leak into the tests: `store.get` is stubbed with the stock defaults.

## claude plugin test plugins/demonbar: 3/3
`/demonbar <profile>`, `/demonbar` (list) and `status`/`revert` pass-through to the CLI.

## CLI: `node --test tests/cli.test.js`
Fresh machine install/revert, byte-identical revert of a pre-populated home, idempotent re-install, surgical revert after
`settings.json` was edited, broken `settings.json` refused, plugin-route `setup`, conflict detection, unknown profile,
uninstall, and the dispatcher rendering `scripts/sample-input.json` through the Node status line for both profiles.

## statusline.js vs statusline.sh
The Node port prints the same bytes as the jq version for the sample input at 160 and 80 columns (checked while building;
percent rounding follows `printf '%.0f'`, half to even).
