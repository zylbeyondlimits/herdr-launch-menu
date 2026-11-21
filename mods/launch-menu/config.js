// The menu's settings and what they do to the agent list. No herdr import, so
// node can test it.
//
// data/launch-menu/config.json (every field optional):
//   { "order":  ["claude", "codex"],             agents first, in this order; the rest after, by name
//     "hidden": ["amp"],                          agents left out of the menu
//     "bypass": { "claude": true,                 start with the agent's own "skip permissions" flag
//                 "my-agent": "--yolo" },          or a flag (or list of flags) of your choosing
//     "flags":  { "codex": ["--model", "gpt-5"] } } more arguments for an agent
// Keys are knownAgents() keys (programs.json). Bypass is off for every agent
// unless the config turns it on.

// Each agent's own flag for running without asking permission.
export const BYPASS_FLAG = {
  claude: "--dangerously-skip-permissions",
  codex: "--dangerously-bypass-approvals-and-sandbox",
  gemini: "--yolo",
  antigravity: "--dangerously-skip-permissions",
};
const BYPASS_FLAGS = new Set(Object.values(BYPASS_FLAG));

const keyOf = (a) => {
  const key = String(a?.key ?? "").trim().toLowerCase();
  // Antigravity's CLI is `agy`.
  return key === "agy" || String(a?.run?.[0] ?? "").toLowerCase() === "agy" ? "antigravity" : key;
};
const words = (list) => (Array.isArray(list) ? list.map((x) => String(x ?? "").trim()).filter(Boolean) : []);
const keys = (list) => words(list).map((x) => x.toLowerCase());
const object = (o) => (o && typeof o === "object" && !Array.isArray(o) ? o : {});

export function normalizeConfig(raw) {
  const src = object(raw);
  const bypass = {};
  for (const [k, v] of Object.entries(object(src.bypass))) {
    const key = k.trim().toLowerCase();
    if (v === true || (typeof v === "string" && v.trim()) || Array.isArray(v)) bypass[key] = v;
  }
  const flags = {};
  for (const [k, v] of Object.entries(object(src.flags))) flags[k.trim().toLowerCase()] = words(v);
  return { order: keys(src.order), hidden: new Set(keys(src.hidden)), bypass, flags };
}

// The flags `bypass` adds for an agent: its own (true), or the ones named.
export function bypassFlags(agent, config) {
  const key = keyOf(agent);
  const spec = config.bypass[String(agent?.key ?? "").toLowerCase()] ?? config.bypass[key];
  if (spec === true) return BYPASS_FLAG[key] ? [BYPASS_FLAG[key]] : [];
  if (typeof spec === "string") return [spec.trim()];
  return words(spec);
}

export const hasBypass = (argv, agent, config) =>
  Array.isArray(argv) && argv.some((x) => BYPASS_FLAGS.has(x) || bypassFlags(agent, config).includes(x));

// knownAgents() list -> the menu's: hidden ones out, each `run` with its
// flags, in the config's order. `normal` on an agent is its run without bypass.
export function menuAgents(list, config) {
  if (!Array.isArray(list)) return [];
  const rank = (a) => {
    const i = config.order.indexOf(String(a.key ?? "").toLowerCase());
    const j = config.order.indexOf(keyOf(a));
    return i >= 0 ? i : j >= 0 ? j : config.order.length;
  };
  return list
    .filter((a) => a && typeof a === "object" && !config.hidden.has(String(a.key ?? "").toLowerCase()) && !config.hidden.has(keyOf(a)))
    .map((a) => {
      const base = Array.isArray(a.run) ? [...a.run] : [];
      const extra = config.flags[String(a.key ?? "").toLowerCase()] ?? config.flags[keyOf(a)] ?? [];
      const normal = [...base, ...extra.filter((f) => !base.includes(f))];
      const run = [...normal, ...bypassFlags(a, config).filter((f) => !normal.includes(f))];
      return { ...a, run, normal };
    })
    .sort((x, y) => rank(x) - rank(y) || String(x.name ?? x.key).localeCompare(String(y.name ?? y.key)));
}

// The config with one agent's bypass turned on or off (for the menu's toggle).
export function toggleBypass(raw, agent) {
  const src = object(raw);
  const bypass = { ...object(src.bypass) };
  const key = keyOf(agent);
  const on = Boolean(bypass[key] ?? bypass[String(agent?.key ?? "").toLowerCase()]);
  delete bypass[String(agent?.key ?? "").toLowerCase()];
  if (on) delete bypass[key];
  else bypass[key] = true;
  return { ...src, bypass };
}

// Whether an agent has a bypass flag the menu knows: only those can be toggled.
export const canBypass = (agent) => Boolean(BYPASS_FLAG[keyOf(agent)]);
