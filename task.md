# Eon CS2 HUD - Current Task List

## Documentation Snapshot

- Updated: 2026-05-09
- Current code state: clean worktree at inspection time
- No code changes have been made as part of this documentation refresh
- Main active theme: `default`
- Theme chain: `userspace -> default -> raw`

## Completed Work

### Phase 1: Security & Stability

- [x] Harden Electron launcher defaults for HUD, config, and radar windows.
- [x] Refactor GSI processing away from avoidable repeated player loops where practical.
- [x] Keep frontend raw GSI state on a shallow websocket-driven path.

### Phase 2: Unified Config SPA

- [x] Move config into a Vue 3 SPA under `src/config`.
- [x] Add centralized config store and websocket synchronization.
- [x] Add sidebar navigation and focused operator workflows.
- [x] Add purpose-built editors for dashboard/live control, layout, series, rules, teams, sponsors, and HUD options.

### Phase 3: Broadcast Feature Expansion

- [x] Add telestrator controls in the config dashboard.
- [x] Add caster alerts for critical events.
- [x] Add local highlight logging for major probability swing outcomes.
- [x] Add win-probability controls and HUD/config display support.
- [x] Add HUD font selection and uploaded font support.
- [x] Add CT/T custom background gradient options.

### Phase 4: Default Theme Direction

- [x] Consolidate active custom HUD direction into `src/themes/default`.
- [x] Keep `raw` as the parser/base foundation.
- [x] Add style presets: Slanted, Classic, Compact, Diagonal, Rounded.
- [x] Rebuild focused player as a single intentional broadcast component.
- [x] Apply the newer broadcast-card treatment to sidebars and roster rows.
- [x] Restrict side K/D/A/ADR panel visibility to freezetime.
- [x] Redesign the top bar into a more integrated broadcast card.
- [x] Align team names, scores, clock, timeout, match-point, and round-winner elements with the newer visual system.
- [x] Include team grenade bar alignment in the top-bar/sidebar redesign pass.
- [x] Fix Compact right sidebar edge anchoring.

### Phase 5: Komplettligaen Intermission Views

- [x] Import and adapt the Komplettligaen scraper into `src/server/integrations/komplettligaen/`.
- [x] Add config and API routes in `src/server/komplettligaen.js`.
- [x] Store selected GG Arena match configuration in `src/themes/userspace/komplettligaen.json`.
- [x] Add config dashboard controls to save and test the selected match id.
- [x] Replace non-live scenes with Eon-native Komplettligaen views:
  - [x] `intro` match overview
  - [x] `halftime` waiting/intermission
  - [x] `fulltime` / `over` result/map summary
  - [x] `analytics` league table/team fixtures
- [x] Keep opponent research out of viewer-facing scenes.

## Active Open Work

### 1. Compact and Classic Sidebar Whitespace

- [ ] Reproduce the current whitespace issue using `tmp/whitespace-sidebars.png` and `tmp/compact-issue-2.png`.
- [ ] Inspect actual outer card width, internal grid tracks, weapon-side reserved space, and spectator/dead-player states.
- [ ] Fix Compact and Classic roster rows so the visual footprint matches the content density.
- [ ] Verify both left and right sidebars at 16:9 and 4:3 capture sizes.

### 2. Spectator-State HUD Issues

Reference screenshots:

- `tmp/Classic-specator-issue.png`
- `tmp/compact-spectator-issues.png`
- `tmp/default-issues-spectator.png`
- `tmp/diagonal-specator-issues.png`
- `tmp/rounded-specator-issues.png`

Tasks:

- [ ] Identify whether each issue is caused by focused-player visibility, sidebar player state, top-bar state, or spectator/freecam handling.
- [ ] Verify behavior during first-person spectating, third-person/freecam, dead-player follow, and no-focused-player states.
- [ ] Ensure each preset has a deliberate fallback state instead of collapsed or floating partial UI.

### 3. Theme Engine Hardening

- [ ] Decide whether to keep the buildless `vue3-sfc-loader` theme model for the next milestone or introduce a bundled build step.
- [ ] Replace the current minimal theme warnings with strict validation for `theme.json` and `settings.json`.
- [ ] Improve error reporting for dynamically generated component `.vue` files and `.append.*` composition failures.
- [ ] Document the supported theme extension contract after the decision.

### 4. Config SPA Hardening

- [ ] Audit save behavior to ensure each editor writes only its intended userspace values.
- [ ] Add clearer dirty/saved/error states per editor, not just global save status.
- [ ] Verify font upload validation and deletion/replacement workflow.
- [ ] Review config layout at smaller laptop resolutions and OBS-side operator displays.

### 5. Komplettligaen Reliability

- [x] Add clearer operator-facing errors for unavailable GG Arena data.
- [x] Verify cached data invalidation when match id or active view changes.
- [x] Confirm all intermission scenes render acceptable fallback content when no match is configured.
- [x] Add a non-viewer offline research workflow only when explicitly requested.
- [x] Remove glowing background blur and center scene content.

## Verification Checklist For Next Code Change

- [ ] `npm start`
- [ ] `npm run start:ui-dev`
- [ ] Open `/hud`, `/config`, `/radar`, and `/api/gsi/status`
- [ ] Exercise all HUD presets: Slanted, Classic, Compact, Diagonal, Rounded
- [ ] Exercise scenes: default gameplay, `intro`, `halftime`, `fulltime`/`over`, `analytics`
- [ ] Check spectator/freecam/no-focused-player states
- [ ] Check userspace settings are written only under `src/themes/userspace`
