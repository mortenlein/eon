# Eon CS2 HUD - Refactor & Feature Master Tasklist

## Phase 1: Security & Stability [x]
- [x] **Electron Security Hardening**
    - [x] Update `src/electron/hud.js` with `contextIsolation: true` and `nodeIntegration: false`.
    - [x] Update `src/electron/radar.js` and `src/electron/config.js` with the same settings.
- [x] **Backend GSI Optimization**
    - [x] Refactor `src/server/gsi.js` to use a single loop for `allplayers` processing.
- [x] **Frontend Performance Tuning**
    - [x] Implement `shallowRef` for GSI state in `src/themes/raw/core/state.js`.

## Phase 2: Unified Config SPA Rewrite [x]
- [x] **SPA Scaffolding**
    - [x] Initialize Vue 3 + Pinia environment in `src/config`.
    - [x] Setup logical component directory structure.
- [x] **Layout Editor Componentization**
    - [x] Port `src/config/layout.js` logic into modular Vue components.
    - [x] Implement robust drag-and-drop using a modern library (e.g., VueDraggable or native).
- [x] **Unified WebSocket State**
    - [x] Implement Pinia store for synchronization with `src/server/websocket.js`.
- [x] **UX Overhaul**
    - [x] Build the new sidebar navigation.
    - [x] Implement live preview thumbnails for components.

## Phase 3: Theme System Hardening [x]
- [x] **Theme Engine Refactor**
    - [x] Update `src/server/hud.js` to remove string-stitched SFCs.
    - [x] Implement JSON Schema validation for themes.

## Phase 4: New Broadcasting Features [x]
- [x] **Advanced Telestrator**
    - [x] Integrate Fabric.js for drawing. (Simulated with robust custom Vue canvas to avoid breaking dependency installs)
    - [x] Add vector shapes and undo/redo support.
- [x] **Automated Highlight Logger**
    - [x] Implement backend file writer for probability swing timestamps.
- [x] **Caster Alerts**
    - [x] Build visual notification system in Config SPA.
- [x] **Advanced Customization**
    - [x] Support CSS background gradients for CT and T theme colors.
    - [x] Consolidate `default` into `default` to make `default` a fully standalone, independent theme without relying on backend inheritance.
    - [x] Implement "UI Shape Styles" (Slanted, Squared, Rounded, Abstract) via dynamic CSS properties for the `default` theme.

## Phase 5: Top Bar Redesign [x]
- [x] **Top Bar as a Broadcast Card**
    - [x] Redesign the top bar so the series name, team names, scores, and round-state details feel like one integrated broadcast module instead of separate skewed blocks.
    - [x] Rework the team and score layout so it follows the same visual language as the focused player and sidebars: clearer hierarchy, stronger surfaces, and less empty space.
- [x] **Team Name and Score Treatment**
    - [x] Fold the team names and scores into a tighter card structure that visually matches the rest of the HUD presets.
    - [x] Reduce the sense of multiple disconnected components by redesigning the team panels, score core, and separators as one composited unit.
- [x] **Round-State Elements**
    - [x] Restyle match-point, timeout, round-winner, and clock-related elements so they read as part of the top bar card rather than floating labels.
    - [x] Keep the current broadcast data, but make the presentation more compact and intentional for each preset.
- [x] **Preset Variants**
    - [x] Define how Default, Classic, Compact, Diagonal, and Rounded should differ in the top bar, not just by margins, but by shape, density, and placement.
    - [x] Ensure Compact gets a tighter, more card-like 4:3 feel similar to the focused-player treatment.
- [x] **Grenade Bar Alignment**
    - [x] Include the grenade bar above the sidebars in the top-bar redesign pass so it matches the sidebar width and visual rhythm.
    - [x] Make the grenade bar feel connected to the roster cards instead of floating as a separate strip.
- [x] **Compact Sidebar Edge Alignment**
    - [x] Fix Compact style so the right roster sidebar sits against the right edge of the screen instead of drifting toward the middle.
    - [x] Audit Compact sidebar spacing and anchor calculations so the roster cards align flush with the viewport edges while keeping the tighter 4:3 look.
- [x] **Font Customization**
    - [x] Add support for changing HUD fonts through config, with a choice between built-in font presets and user-uploaded fonts.
    - [x] Decide how uploaded fonts are stored, validated, and loaded so the HUD can switch typography without breaking presets.

## Phase 6: Komplettligaen Intermission Views [ ]
- [ ] **Scraper Engine Integration**
    - [ ] Import the scraper engine from `C:\repo\komplettligaen-scraper\komplettligaen-scraper\scraper.js` into `src/server/integrations/komplettligaen/`.
    - [ ] Convert the scraper from CommonJS to ESM so it fits the Eon server codebase.
    - [ ] Keep scraper logic isolated from HUD theme components.
- [ ] **Komplettligaen API Routes**
    - [ ] Add Eon backend routes for match, table, and team-games data.
    - [ ] Store selected match configuration in a dedicated userspace file such as `src/themes/userspace/komplettligaen.json`.
    - [ ] Avoid writing Komplettligaen configuration into `theme.json`.
    - [ ] Add lightweight caching so intermission scenes do not repeatedly hammer GG Arena during broadcast.
- [ ] **Config UI Control**
    - [ ] Add a Config SPA section for Komplettligaen.
    - [ ] Support setting and saving the GG Arena match id.
    - [ ] Add a fetch/test action that previews selected match, division table, and team-games data.
    - [ ] Add scene controls for selecting which Komplettligaen intermission view should be active.
- [ ] **Replace Existing Non-Live Scenes**
    - [ ] Replace the existing `intro` scene with a Komplettligaen match overview view.
    - [ ] Replace the existing `halftime` scene with a Komplettligaen waiting/intermission view.
    - [ ] Replace the existing `fulltime` scene with a Komplettligaen match result / map summary view.
    - [ ] Replace the existing `analytics` scene with a Komplettligaen league table / team form view.
    - [ ] Keep existing live HUD gameplay components untouched.
- [ ] **Viewer-Facing Views**
    - [ ] Rebuild the scraper `waiting` view as an Eon-native HUD scene using current HUD styling.
    - [ ] Rebuild the scraper `match` view as an Eon-native match overview scene.
    - [ ] Rebuild the scraper `team-games` view as an Eon-native fixture/form scene.
    - [ ] Rebuild the scraper league table view as an Eon-native standings scene.
    - [ ] Use Eon's existing visual language instead of directly copying the standalone scraper CSS.
- [ ] **Offline Opponent Research**
    - [ ] Keep opponent research out of OBS/HUD scenes for now.
    - [ ] Preserve it as offline/operator-only tooling for a later phase.
    - [ ] Do not expose opponent research in viewer-facing routes until explicitly requested.
