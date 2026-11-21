// The + menu: a terminal, the agents this machine has (in your order, without
// the hidden ones, with your flags), a new space or worktree. Herdr's new-menu
// plus data/launch-menu/config.json (config.js), ↑/↓ and Enter, ⌥-click to split
// right, and per agent a "bypass" switch (right-click) for its own
// skip-permissions flag, off unless you turn it on; ⇧-click starts it without.
import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, spaces, panes, knownAgents, run, openOverlay, closeOverlay, props, window, keys, shared, setShared, appHome, readTextFile, writeTextFile, checking, notify } from "herdr";
import { mkdir } from "fs/promises";
import { normalizeConfig, menuAgents, hasBypass, toggleBypass, canBypass } from "./config.js";

// The last agents each machine reported, shown at once while knownAgents() checks again.
const KNOWN = "launch-menu.agents";
// The config as last read: each open of the popup is a new copy, so it's kept in shared state.
const CONFIG = "launch-menu.config";
const configPath = () => `${appHome()}/data/launch-menu/config.json`;

function shortcut(name) {
  const k = keys().find(b => b.section === "global" && b.action === name);
  if (!k?.keys.trim()) return "";
  const mac = window()?.platform === "macos";
  const names = mac ? { ctrl: "⌃", alt: "⌥", shift: "⇧", cmd: "⌘", fn: "fn" } : { ctrl: "Ctrl", alt: "Alt", shift: "Shift", cmd: "Super", fn: "Fn" };
  const alias = { secondary: mac ? "cmd" : "ctrl", super: "cmd", win: "cmd" };
  return k.keys.trim().split(/\s+/).map(stroke => {
    const parts = stroke.split("-");
    let key = parts.pop();
    if (key === "") { key = "-"; parts.pop(); }
    const held = new Set(parts.map(m => alias[m.toLowerCase()] ?? m.toLowerCase()));
    if (/^[A-Z]$/.test(key)) held.add("shift");
    const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1).toLowerCase();
    return [...Object.keys(names).filter(m => held.has(m)).map(m => names[m]), label].join(mac ? "" : "+");
  }).join(" ");
}

export default class LaunchMenu extends View {
  init(_props, cx) {
    const machine = spaces().find(s => s.active)?.machine;
    const where = machine ?? "";
    this.raw = shared(CONFIG) ?? {};
    // Until this machine is checked: what this menu, else Herdr's, saw last.
    this.known = shared(KNOWN)?.[where] ?? shared("new-menu.agents")?.[where] ?? [];
    this.at = -1;
    this.handle = cx.focus_handle();
    this.handle.focus();
    if (checking()) return;
    cx.spawn(async cx => {
      const text = await readTextFile(configPath()).catch(() => null);
      if (text !== null) {
        try { this.raw = JSON.parse(text); setShared(CONFIG, this.raw); }
        catch { this.configError = "config.json isn't valid JSON"; }
      } else if (shared(CONFIG)) setShared(CONFIG, null);
      cx.notify();
      try {
        this.known = await knownAgents({ on: machine });
        setShared(KNOWN, { ...shared(KNOWN), [where]: this.known });
      }
      catch { this.failed = true; }
      cx.notify();
    });
  }

  // Not close(): Herdr calls a View's close(cx) itself when the overlay goes.
  dismiss() { closeOverlay(props().overlay); }

  // Starts an agent: a new tab, or (⌥) split right of the focused pane; ⇧ without bypass.
  launch(a, space, e) {
    if (!a?.installed) return;
    const argv = e?.modifiers?.shift ? a.normal : a.run;
    this.dismiss();
    if (e?.modifiers?.alt && space) run("pane.split", { direction: "right", argv });
    else run("tab.new", { name: a.name, space: space?.id, argv });
  }

  // Right-click an agent: its bypass on or off, saved to config.json.
  toggle(a, cx) {
    if (!canBypass(a)) return;
    const next = toggleBypass(this.raw, a);
    cx.spawn(async cx => {
      try {
        const now = await readTextFile(configPath()).catch(() => null);
        await mkdir(`${appHome()}/data/launch-menu`, { recursive: true });
        // Written only if the file is still as read (null: it didn't exist).
        await writeTextFile(configPath(), JSON.stringify(next, null, 2) + "\n", now);
        this.raw = next;
        setShared(CONFIG, next);
      } catch (err) {
        notify({ title: "Couldn't save the menu's settings", body: String(err?.message ?? err), level: "error" });
      }
      cx.notify();
    });
  }

  row(id, icon, name, action, { hint = "", enabled = true, selected = false, badge = null, tip = null, onRight = null } = {}) {
    const t = theme();
    return h_flex().id(id).h(31).px(9).gap(10).rounded(7).items_center().flex_none()
      .text_color(enabled ? t.foreground : t.dim)
      .when(enabled && selected, el => el.bg(t.selected))
      .when(enabled, el => el.hover(s => s.bg(t.selected)))
      .when(Boolean(tip), el => el.tooltip(tip))
      .when(Boolean(onRight), el => el.on_mouse_down("right", (e, cx) => { cx.stop_propagation(); onRight(e, cx); }))
      .on_click((e) => { if (enabled) action(e); })
      .child(icon)
      .child(h_flex().flex_1().min_w(0).gap(6).items_center().child(div().truncate().child(name)).when(Boolean(badge), el => el.child(badge)))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(hint));
  }

  render() {
    const t = theme();
    const space = spaces().find(s => s.active);
    const config = normalizeConfig(this.raw);
    const agents = menuAgents(this.known, config);
    const installed = agents.filter(a => a.installed);
    const choices = this.failed ? installed : [...installed, ...agents.filter(a => !a.installed).slice(0, 2)];
    const mac = window()?.platform === "macos";
    const alt = mac ? "⌥" : "Alt+", shift = mac ? "⇧" : "Shift+";

    // Every enabled row in order, for ↑/↓ and Enter.
    const actions = [];
    const add = (enabled, fn) => (enabled ? actions.push(fn) - 1 : -1);
    const terminal = add(true, (e) => { this.dismiss(); if (e?.modifiers?.alt && space) run("pane.split", { direction: "right" }); else run("tab.new", { space: space?.id }); });
    const picks = choices.map(a => add(a.installed, (e) => this.launch(a, space, e)));
    const newSpace = add(true, () => { this.dismiss(); run("space.new"); });
    const worktree = (action, size) => () => { this.dismiss(); openOverlay({ mod: "worktree", kind: "dialog", ...size, props: { space: space?.id, folder: panes().find(p => p.focused)?.cwd, action } }); };
    const wtNew = add(Boolean(space), worktree("new", { width: 460, height: 280 }));
    const wtOpen = add(Boolean(space), worktree("open", { width: 560, height: 480 }));

    const badge = () => div().flex_none().px(4.5).py(1).rounded(4).border(1).border_color(t.working + "73").bg(t.working + "24")
      .text_size(9.5).font_semibold().text_color(t.working).child("bypass");

    return v_flex().min_h(0).w_full().h(Math.min(491, 167 + Math.max(1, choices.length + (this.failed || this.configError ? 1 : 0)) * 31)).bg(t.popover).p(5).text_size(12.8)
      .id("launch-menu").track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "escape") return this.dismiss();
        if (e.key === "down" || e.key === "up") {
          const n = actions.length;
          if (!n) return;
          this.at = e.key === "down" ? (this.at + 1) % n : (this.at <= 0 ? n - 1 : this.at - 1);
          return cx.notify();
        }
        if (e.key === "enter" && actions[this.at]) return actions[this.at](e);
        if (e.modifiers.control || e.modifiers.platform) return;
        // 1–9: the installed agents; with ⌥ split right, with ⇧ without bypass.
        const agent = /^[1-9]$/.test(e.key) ? installed[Number(e.key) - 1] : null;
        if (agent) this.launch(agent, space, e);
      })
      .child(this.row("terminal", svg("icons/shell.svg").size(14).flex_none(), "Terminal", actions[terminal], { hint: shortcut("tab.new"), selected: this.at === terminal }))
      .child(div().px(9).pt(8).pb(4).text_size(11).text_color(t.dim).child("Start an agent"))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar()
        .children(choices.map((a, i) => {
          const bypass = a.installed && hasBypass(a.run, a, config);
          const tip = !a.installed ? null
            : `${a.run.join(" ")}\n${alt}click: split right${bypass ? ` · ${shift}click: without bypass` : ""}${canBypass(a) ? ` · right-click: bypass ${bypass ? "off" : "on"}` : ""}`;
          return this.row(a.key, a.tint ? svg(a.icon).size(14).flex_none().text_color(a.installed ? t.foreground : t.dim) : image(a.icon).size(14).flex_none(), a.name,
            (e) => actions[picks[i]]?.(e),
            { hint: a.installed ? (i < 9 ? String(i + 1) : "") : "not installed", enabled: a.installed, selected: picks[i] >= 0 && this.at === picks[i],
              badge: bypass ? badge() : null, tip, onRight: a.installed && canBypass(a) ? (_e, cx) => this.toggle(a, cx) : null });
        }))
        .when(this.failed || agents.length === 0, el => el.child(div().px(9).py(6).text_color(t.dim).child(this.failed ? "Could not check installed agents" : "Checking installed agents…")))
        .when(Boolean(this.configError), el => el.child(div().px(9).py(6).text_size(11.5).text_color(t.blocked).child(this.configError))))
      .child(div().h(1).mx(4).my(5).bg(t.border))
      .child(this.row("space", div().w(14).flex_none().child("+"), "New space", actions[newSpace], { hint: shortcut("space.new"), selected: this.at === newSpace }))
      .child(this.row("worktree", svg("mods/workspace-chrome/branch.svg").size(14).flex_none(), "New worktree…", (e) => actions[wtNew]?.(e), { enabled: Boolean(space), selected: wtNew >= 0 && this.at === wtNew }))
      .child(this.row("worktree-open", svg("mods/workspace-chrome/branch.svg").size(14).flex_none(), "Open worktree…", (e) => actions[wtOpen]?.(e), { enabled: Boolean(space), selected: wtOpen >= 0 && this.at === wtOpen }));
  }
}
