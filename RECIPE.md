# Launch Menu

Herdr's + menu with your agents in your order, the unused ones hidden, extra
flags per agent, and a per-agent "bypass" switch for the agent's own
skip-permissions flag, off until you turn it on.

![Launch Menu](preview.png)

## What you see

A popup 268px wide, up to 491px tall (167px plus 31px per agent row),
`popover` background, 5px padding, 12.8px text.

- "Terminal" row (14px `icons/shell.svg`), with `tab.new`'s key on the right.
- "Start an agent" (11px `dim`), then one 31px row per installed agent in
  config order (the rest by name): its icon, its name, a **bypass** badge when
  it starts with a bypass flag (9.5px semibold, `working` text on 14%
  `working`, 45% `working` border, 4px corners), and its number 1–9 on the
  right. Up to two agents that aren't installed follow, `dim`, "not
  installed". The list scrolls when long.
- A 1px `border` divider, "New space" (with `space.new`'s key), "New
  worktree…" and "Open worktree…" (`branch.svg` from workspace-chrome),
  disabled without a space.
- The row under ↑/↓ and hovered rows have a `selected` background. An agent's
  tooltip is its full command and what ⌥-click, ⇧-click and right-click do.
- An invalid config shows "config.json isn't valid JSON" in `blocked` under
  the agents.

## How it behaves

- Click or Enter starts the agent as a new tab named after it; ⌥ splits it
  right of the focused pane; ⇧ starts it without its bypass flag. 1–9 start the
  installed agents by number with the same modifiers. Esc closes.
- Right-click an agent with a known flag: bypass on or off, saved to the
  config at once; the badge follows.
- The agent list shows what this machine reported last at once, then what
  `knownAgents()` finds.

## Built from

- `mods/launch-menu`: Herdr 0.1.16's `new-menu`, cloned with `mod.clone`
  (Apache 2.0, `LICENSE`, `NOTICE`). `mod.json` overlay 268×512 popup.
- `config.js`, no herdr import: `normalizeConfig`, `menuAgents` (hide, order,
  `run` with flags and bypass, `normal` without bypass), `bypassFlags`,
  `hasBypass`, `toggleBypass`, `canBypass`, `BYPASS_FLAG`.
- `main.js`: `knownAgents({ on: machine })`, `tab.new`, `pane.split`,
  `space.new`, `openOverlay` for `worktree`. Shared state:
  `launch-menu.agents` (per machine) and `launch-menu.config` (the config as
  last read). Reads `new-menu.agents` only to show something before the
  first check.
- Config file: `appHome()/data/launch-menu/config.json`, read with
  `readTextFile`, written with `writeTextFile(path, text, previous)` after
  `mkdir`.
- Your tab bar opens it: in Herdr's `tabs` (a clone of it), change the +
  button's `openOverlay({ mod: "new-menu", … width: 250 … })` to
  `{ mod: "launch-menu", kind: "popup", width: 268, height: 512 }`.

## Watch out

- Popups are a new copy each open, with their own localStorage: keep anything
  that must outlive one open in `shared` or a file.
- Don't write to `new-menu.agents`: Herdr's menu reads it, and a filtered or
  flag-added list would leak into it.
- Write the config with the text you read as `expected` (null when there was
  none): a stale write is refused instead of overwriting the person's edit.
- `mkdir` the data folder first; `writeTextFile` doesn't make folders.
- Antigravity's key may come as `agy`; match on the command too.
- Don't name a View method `close()` for your own use: Herdr calls `close(cx)`
  when the popup goes.

## Done when

- `herdr-app check mods/launch-menu` and `tests/run.sh` pass.
- With no config, no agent has a bypass badge and every command is
  `knownAgents()`'s `run`.
- With `{ "order": ["codex", "claude"], "hidden": ["amp"], "bypass":
  { "claude": true } }`: Claude Code (installed) is first with the badge, Amp
  is gone, the rest are by name.
- Turning a bypass off then on leaves `config.json` with only that change;
  editing the file while the menu is open makes the next toggle fail with a
  toast and keeps the edit.
