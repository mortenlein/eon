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

## Phase 5: Top Bar Redesign [ ]
- [ ] **Top Bar as a Broadcast Card**
    - [ ] Redesign the top bar so the series name, team names, scores, and round-state details feel like one integrated broadcast module instead of separate skewed blocks.
    - [ ] Rework the team and score layout so it follows the same visual language as the focused player and sidebars: clearer hierarchy, stronger surfaces, and less empty space.
- [ ] **Team Name and Score Treatment**
    - [ ] Fold the team names and scores into a tighter card structure that visually matches the rest of the HUD presets.
    - [ ] Reduce the sense of multiple disconnected components by redesigning the team panels, score core, and separators as one composited unit.
- [ ] **Round-State Elements**
    - [ ] Restyle match-point, timeout, round-winner, and clock-related elements so they read as part of the top bar card rather than floating labels.
    - [ ] Keep the current broadcast data, but make the presentation more compact and intentional for each preset.
- [ ] **Preset Variants**
    - [ ] Define how Default, Classic, Compact, Diagonal, and Rounded should differ in the top bar, not just by margins, but by shape, density, and placement.
    - [ ] Ensure Compact gets a tighter, more card-like 4:3 feel similar to the focused-player treatment.
- [ ] **Grenade Bar Alignment**
    - [ ] Include the grenade bar above the sidebars in the top-bar redesign pass so it matches the sidebar width and visual rhythm.
    - [ ] Make the grenade bar feel connected to the roster cards instead of floating as a separate strip.
- [ ] **Compact Sidebar Edge Alignment**
    - [ ] Fix Compact style so the right roster sidebar sits against the right edge of the screen instead of drifting toward the middle.
    - [ ] Audit Compact sidebar spacing and anchor calculations so the roster cards align flush with the viewport edges while keeping the tighter 4:3 look.
- [ ] **Font Customization**
    - [ ] Add support for changing HUD fonts through config, with a choice between built-in font presets and user-uploaded fonts.
    - [ ] Decide how uploaded fonts are stored, validated, and loaded so the HUD can switch typography without breaking presets.
