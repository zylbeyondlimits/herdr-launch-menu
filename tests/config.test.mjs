import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig, menuAgents, hasBypass, toggleBypass, canBypass } from "./build/launch-menu/config.mjs";

const known = [
  { key: "codex", name: "Codex", run: ["codex", "--no-daemon"], installed: true },
  { key: "claude", name: "Claude Code", run: ["claude"], installed: true },
  { key: "antigravity", name: "Antigravity", run: ["agy"], installed: true },
  { key: "amp", name: "Amp", run: ["amp"], installed: false },
];

test("no config: bypass is off for every agent, order is by name", () => {
  const out = menuAgents(known, normalizeConfig(null));
  assert.deepEqual(out.map((a) => a.key), ["amp", "antigravity", "claude", "codex"]);
  for (const a of out) {
    assert.deepEqual(a.run, a.normal);
    assert.equal(hasBypass(a.run, a, normalizeConfig(null)), false);
  }
});

test("order, hidden and flags", () => {
  const cfg = normalizeConfig({ order: ["Claude", "codex"], hidden: ["amp"], flags: { codex: ["--model", "gpt-5"] } });
  const out = menuAgents(known, cfg);
  assert.deepEqual(out.map((a) => a.key), ["claude", "codex", "antigravity"]);
  assert.deepEqual(out[1].run, ["codex", "--no-daemon", "--model", "gpt-5"]);
});

test("bypass true adds the agent's own flag; normal stays without it", () => {
  const cfg = normalizeConfig({ bypass: { claude: true, codex: true } });
  const out = Object.fromEntries(menuAgents(known, cfg).map((a) => [a.key, a]));
  assert.deepEqual(out.claude.run, ["claude", "--dangerously-skip-permissions"]);
  assert.deepEqual(out.claude.normal, ["claude"]);
  assert.deepEqual(out.codex.run, ["codex", "--no-daemon", "--dangerously-bypass-approvals-and-sandbox"]);
  assert.equal(hasBypass(out.claude.run, out.claude, cfg), true);
});

test("Antigravity is found by its agy command, and a custom flag works", () => {
  const cfg = normalizeConfig({ bypass: { antigravity: true, "my-agent": "--yes" } });
  const mine = { key: "my-agent", name: "Mine", run: ["mine"], installed: true };
  const out = Object.fromEntries(menuAgents([...known, mine], cfg).map((a) => [a.key, a]));
  assert.deepEqual(out.antigravity.run, ["agy", "--dangerously-skip-permissions"]);
  assert.deepEqual(out["my-agent"].run, ["mine", "--yes"]);
  assert.equal(hasBypass(out["my-agent"].run, out["my-agent"], cfg), true);
});

test("the toggle turns one agent's bypass on, then off, and keeps the rest", () => {
  const claude = known[1];
  const on = toggleBypass({ order: ["claude"], bypass: { codex: true } }, claude);
  assert.deepEqual(on, { order: ["claude"], bypass: { codex: true, claude: true } });
  const off = toggleBypass(on, claude);
  assert.deepEqual(off, { order: ["claude"], bypass: { codex: true } });
});

test("only agents with a known flag can be toggled", () => {
  assert.equal(canBypass(known[1]), true);
  assert.equal(canBypass(known[3]), false);
});

test("junk config is ignored, not thrown", () => {
  const cfg = normalizeConfig({ order: "claude", hidden: [1, null], bypass: [], flags: { x: "y" } });
  assert.equal(menuAgents(known, cfg).length, 4);
  assert.deepEqual(menuAgents(null, cfg), []);
});
