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

### Phase 6: Slanted Preset 1920x1080 Hardening

- [x] Scoped Slanted radar width to 21% inside `index.css`.
- [x] Scoped Slanted top bar width to 52% and left position to 24% inside `index.css`.
- [x] Confirmed zero visual regression or changes in Classic, Compact, focused player, and victory poster components.

### Phase 7: Broadcast-Safe Config SPA Constraints

- [x] Converted `css.radar-width` from free-form text to constrained select (18%/20%/21%/22%) in `theme.json`.
- [x] Converted `css.lan66-sidebar-scale-y` to number with min/max/step bounds (0.8–1.05, step 0.05) in `theme.json`.
- [x] Added select dropdown and numeric input rendering with validation in `OptionsEditor.vue`.
- [x] Added load-time sanitization and save-time clamping for bounded numeric options.
- [x] Added drag-time clamping for sidebar scale-y in `LayoutEditor.vue`.
- [x] Audited remaining unconstrained variables; `css.lan66-event-badge-top` flagged as medium risk for future pass.

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

### 6. Legacy LAN66/Fennec Audit

- [x] Search for all occurrences of lan66, fennec, css.lan66, --lan66 in codebase.
- [x] Classify each occurrence as canonical, legacy-alias, deprecated, or dead.
- [x] Map all legacy settings to their canonical equivalents.
- [x] Propose a clean prefix-based naming model (layout.*, style.*, broadcast.*, etc.).
- [x] Create a comprehensive deprecation map artifact.
- [x] Recommend the first safe implementation step.

### 7. Phase 1 LAN66/Fennec Cleanup

- [x] Remove dead settings `css.lan66-sidebar-scale-x`, `css.lan66-sidebar-scale-y`, and `css.lan66-maps-sleek-display` from default `theme.json` ✅
- [x] Remove scale key bindings and visual resize capabilities for sidebars in `LayoutEditor.vue` ✅
- [x] Rebrand legacy fallback and title strings `"LAN66NORD"` and `"LAN66NORD Broadcast HUD"` to `"Eon Broadcast"` and `"Eon Broadcast HUD"` in `theme.json` and `shell.html` ✅
- [x] Verify Config SPA, Layout Editor, and HUD pages load successfully without crash or regressions ✅

### 8. Centralized Configuration Resolution Layer

- [x] Create `resolve-option.js` containing centralized `resolveOption`, `resolveCssOption`, and `applyResolvedCssVariables` helpers.
- [x] Define `RADAR_OPTION_DEFINITIONS` fully within `resolve-option.js`.
- [x] Call `applyResolvedCssVariables(RADAR_OPTION_DEFINITIONS)` inside `shell.js`'s `applyCssVariableOverrides()`.
- [x] Update generic `css.*` loop in `shell.js` to skip migrated keys.
- [x] Verify HUD radar rendering, reactive toggling, and backwards compatibility.
- [x] Migrate Top Bar option slice (`layout.topbar.top`, `layout.topbar.visible`) using centralized resolve-option.js.
- [x] Migrate Sidebar position option slice (`layout.sidebar.left`, `layout.sidebar.right`, `layout.sidebar.bottom`) using centralized resolve-option.js.
- [x] Migrate Sidebar visibility option slice (`layout.sidebar.leftVisible`, `layout.sidebar.rightVisible`) using centralized resolve-option.js.
- [x] Migrate Players Alive option slice (`layout.playersAlive.top`, `layout.playersAlive.right`, `layout.playersAlive.visible`) using centralized resolve-option.js.
- [x] Migrate Focused Player option slice (`layout.focusedPlayer.bottom`, `layout.focusedPlayer.visible`) using centralized resolve-option.js.
- [x] Migrate Current Map option slice (`layout.currentMap.bottom`, `layout.currentMap.right`, `style.currentMap.width`, `layout.currentMap.visible`) using centralized resolve-option.js.
- [x] Migrate Event Badge option slice (`layout.eventBadge.top`, `layout.eventBadge.left`, `style.eventBadge.width`, `style.eventBadge.logoHeight`, `style.eventBadge.titleSize`, `style.eventBadge.metaSize`, `layout.eventBadge.visible`) using centralized resolve-option.js.
- [x] Migrate Sponsor Slots option slice (`layout.sponsorLeft.top`, `layout.sponsorLeft.left`, `layout.sponsorLeft.visible`, `layout.sponsorRight.top`, `layout.sponsorRight.right`, `layout.sponsorRight.visible`, `style.sponsors.width`, `style.sponsors.height`) using centralized resolve-option.js.
- [x] Migrate Maps option slice (`layout.maps.top`, `layout.maps.left`, `style.maps.scale`, `layout.maps.visible`, `layout.mapsSleek.top`, `layout.mapsSleek.left`, `style.mapsSleek.scale`) using centralized resolve-option.js.
- [x] Implement Theme Materials PoC (`theme.materials.panelFill`, `theme.materials.panelBorder`) using centralized resolve-option.js.
- [x] Migrate Theme Colors slice (`theme.colors.ctFill`, `theme.colors.ctBorder`, `theme.colors.ctText`, `theme.colors.tFill`, `theme.colors.tBorder`, `theme.colors.tText`, `theme.colors.red`, `theme.colors.green`) using centralized resolve-option.js.
- [x] Migrate Theme Shapes slice (`theme.shapes.radius`, `theme.shapes.skewAngle`, `theme.shapes.skewComplement`) using centralized resolve-option.js.
- [x] Migrate Theme Typography slice (`theme.typography.primaryFont`, `theme.typography.customFontUrl`) using centralized resolve-option.js.

### Phase 9: Config SPA Backend Canonical Translation Layer (Phase 3A)

- [x] Implement Phase 3A: Config SPA backend canonical translation layer.
  - [x] Create `src/server/helpers/canonical-map.js`
  - [x] Add `normalizeSettingsOptions` in `settings.js`
  - [x] Update `getSettings()`
  - [x] Update `PUT /config/options`
  - [x] Update `POST /config/import`
  - [x] Add lightweight migration telemetry logging in dev mode
  - [x] Verify functionality

### Phase 10: Config SPA Canonical Schema Synchronization (Phase 3B)

- [x] Implement Phase 3B: Config SPA canonical schema synchronization.
  - [x] Update LayoutEditor.vue to natively use canonical `layout.*`, `style.*`, `theme.*` keys
  - [x] Update OptionsEditor.vue key groupings and Font Upload flow to use canonical typography keys
  - [x] Keep server normalization intact for backwards compatibility and clean canonical PUT saves
  - [x] Add lightweight dev telemetry alerts for legacy key usage in Config SPA
  - [x] Verify drag/save operations emit and persist canonical keys only with zero legacy key duplication

### Phase 11: Explicit Deprecation Lifecycle System

- [x] Add alias-level lifecycle metadata to option-slice definitions ✅
- [x] Add `getDeprecatedAliases()` and `getSunsetCandidates(targetRelease)` to `canonical-map.js` ✅
- [x] Add one-time server console warnings when legacy aliases are loaded or imported ✅
- [x] Create `docs/architecture/config-migration.md` containing full deprecation architecture ✅
- [x] Verify via a temporary developer test script or server startup checks ✅

### Phase 12: 1:1 HUD Layout Editor & Safety Diagnostics (Phases 18A, 18B, 18C)

- [x] Rebuild Layout Editor workspace around strict 1920x1080 virtual canvas with CS2 gameplay screenshots ✅
- [x] Add togglable safety outlines: 40px/10px grid, center alignment lines, and 10% TV/Broadcast safe boundaries ✅
- [x] Implement coordinate bounds clamping preventing elements from sliding off-screen ✅
- [x] Lock horizontal dragging wiggles for center-anchored HUD blocks ✅
- [x] Clean dead scale coordinates and deprecated fennec/lan66 option bindings ✅
- [x] Construct high-fidelity HTML/CSS visual mockups inheriting active theme slants, radii, fonts, and colors ✅
- [x] Implement lightweight AABB collision solver ignoring hidden/self elements and updating live ✅
- [x] Implement 10% Broadcast safe-area warning outlines and status indicators ✅
- [x] Construct properties diagnostics inspector showing anchor info, pixel & canonical coords, size, safe-zone, and overlap clashing lists ✅
- [x] Maintain high performance without layout thrashing, DOM querying, watchers, or interval timers ✅

## Verification Checklist For Next Code Change

- [ ] `npm start`
- [ ] `npm run start:ui-dev`
- [ ] Open `/hud`, `/config`, `/radar`, and `/api/gsi/status`
- [ ] Exercise all HUD presets: Slanted, Classic, Compact, Diagonal, Rounded
- [ ] Exercise scenes: default gameplay, `intro`, `halftime`, `fulltime`/`over`, `analytics`
- [ ] Check spectator/freecam/no-focused-player states
- [ ] Check userspace settings are written only under `src/themes/userspace`



