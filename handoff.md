# Eon HUD Handoff - 2026-05-08

## Branch

- Current working branch: `codex/ui-layout-stabilization`

## What Was Finished

### Config App

- Reworked `src/config` into a clearer SPA flow with sidebar navigation.
- Added purpose-built editors instead of relying on raw textareas for core setup.
- Added sidebar icons for a cleaner config UI.
- Reworked `HUD Options` into grouped broadcast-facing controls instead of a raw settings browser.

### Theme Cleanup

- Consolidated active HUD work into the `default` theme.
- `fennec` and `lan66nord` are no longer part of the active theme direction.
- Added style presets inside `default` instead of splitting into separate themes.

### HUD Style Presets

- Active presets exposed in config:
  - `Default` / `slanted`
  - `Classic`
  - `Compact`
  - `Diagonal`
  - `Rounded`

These presets now differ by more than spacing alone. The work moved into component-specific structure and styling.

### Focused Player

- Rebuilt the focused-player HUD from the bottom up.
- It is now rendered as one purpose-built component instead of three legacy pieces visually patched together.
- Removed the visible weapon block from the focused-player card.
- Presets now have distinct focused-player treatments:
  - `Default`: angular lower-third
  - `Classic`: cleaner broadcast bar
  - `Compact`: tighter, more card-like layout
  - `Diagonal`: stronger slanted styling
  - `Rounded`: softer capsule-style treatment

### Sidebars / Roster Rows

- Started applying the same visual language from focused-player to the left/right roster rows.
- Added stronger card surfaces and embedded health-strip treatment.
- Side K/D/A/ADR panel is now only shown during freezetime.

## Important Current Open Issues

### 1. Compact / Classic Sidebar Whitespace

- This is the main unresolved visual bug.
- The roster rows in `Compact` and `Classic` still appear to reserve too much empty space on the weapon side.
- Reference screenshot:
  - `tmp/whitespace-sidebars.png`

Several CSS width/grid adjustments were attempted in:

- `src/themes/default/index.css`
- `src/themes/default/sidebars/sidebar/player/player.css`

This needs a fresh visual pass tomorrow, because the last fix attempts compacted internal content more than the outer visual footprint.

### 2. Compact Right Sidebar Edge Alignment

- Already captured in `task.md`.
- In `Compact`, the right sidebar needs to sit flush to the right edge of the screen.

### 3. Top Bar Still Needs Full Redesign

- The focused-player and sidebar direction is now much stronger than the top bar.
- The top bar still needs the same broadcast-card treatment.
- This work is already broken out in `task.md` under `Phase 5`.

## Files Most Relevant To Continue

### Focused Player

- `src/themes/default/focused-player/focused-player.js`
- `src/themes/default/focused-player/focused-player.html`
- `src/themes/default/focused-player/focused-player.css`

### Sidebar Player Rows

- `src/themes/default/sidebars/sidebar/player/player.css`
- `src/themes/default/sidebars/sidebar/player/health-bar/health-bar.css`
- `src/themes/default/sidebars/sidebar/player/name/name.css`
- `src/themes/default/sidebars/sidebar/player/additional-metrics/additional-metrics.js`
- `src/themes/default/sidebars/sidebar/player/additional-metrics/additional-metrics.html`

### Theme / Preset Control

- `src/themes/default/index.css`
- `src/themes/default/theme.json`
- `src/config/components/OptionsEditor.vue`
- `src/config/components/Dashboard.vue`

### Planning

- `task.md`

## Recommended Restart Tomorrow

1. Read `handoff.md`
2. Read `task.md`
3. Inspect `tmp/whitespace-sidebars.png`
4. Continue with:
   - fixing Compact / Classic sidebar whitespace
   - fixing Compact right-edge anchoring
   - redesigning the top bar and grenade bar to match the newer component style

## Notes

- Do not reset, stash, or clean the worktree.
- There are many ongoing local changes and untracked files by design.
- The correct continuation point is the current branch and repo state, not the old chat transcript.
