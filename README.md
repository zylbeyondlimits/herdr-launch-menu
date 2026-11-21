# Launch Menu

Herdr's **+** menu, set up the way you start agents.

- Put your agents in your order and hide the ones you don't use.
- Give an agent extra flags (`--model …`).
- Right-click an agent to turn on its own "skip permissions" flag
  (`--dangerously-skip-permissions` for Claude Code and Antigravity,
  `--dangerously-bypass-approvals-and-sandbox` for Codex, `--yolo` for
  Gemini). A **bypass** badge marks it. It's off for every agent until you
  turn it on.
- ⇧-click starts it without bypass this once; ⌥-click splits it to the
  right of the focused pane; 1–9 and ↑/↓ Enter work from the keyboard.

Tested on official Herdr 0.1.16, macOS.

## Install

Tell your Herdr agent:

> Add the Launch Menu mod from github.com/zylbeyondlimits/herdr-launch-menu

It copies `mods/launch-menu` and points your tab bar's **+** at it (one line
in the tab bar mod; see `RECIPE.md`).

## Settings

`~/.config/herdr-app/data/launch-menu/config.json`, every field optional:

```json
{
  "order":  ["claude", "codex"],
  "hidden": ["amp"],
  "bypass": { "claude": true, "my-agent": "--yes" },
  "flags":  { "codex": ["--model", "gpt-5"] }
}
```

Keys are the agents' keys from Herdr's program table (`programs.json`). The
right-click switch edits `bypass` here; it never overwrites edits you made
since the menu opened.

## What it touches

Reads and writes only that config file. Runs agents the way Herdr's menu does
(`knownAgents()`). No network.

## Tests

```sh
tests/run.sh
```

## 中文说明

Launch Menu 是 Herdr 顶栏 **+** 菜单的增强版：可以调整 agent 顺序、隐藏不用的、加启动参数；右键某个 agent 可以打开它自己的「跳过权限」参数，默认对所有 agent 都是关闭的。⇧ 点击这次不带 bypass 启动，⌥ 点击在右边分屏启动。

## License

Apache 2.0 (`mods/launch-menu` is a modified copy of Herdr's `new-menu`; see
its `LICENSE` and `NOTICE`). The tests are MIT.
