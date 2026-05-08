# Eon CS2 Broadcasting HUD - System Specification

## 1. System Architecture
Eon is a real-time broadcasting overlay system for Counter-Strike 2. It bridges the gap between CS2's Game State Integration (GSI) and a visual overlay captured by broadcasting software (OBS/vMix).

### 1.1 Core Components
*   **GSI Receiver (Node.js/Koa):** Listens for HTTP POST requests from the CS2 client.
*   **State Engine:** Processes raw GSI data, calculates derived metrics (Win Probability, MVP, Economy), and maintains the current source of truth.
*   **WebSocket Server:** Throttles and broadcasts state changes at a maximum of 20Hz (50ms) to connected frontend clients.
*   **Overlay Renderer (Electron/Vue):** A transparent, click-through Chromium window that consumes the WebSocket feed and renders the HUD using DOM/CSS.
*   **Config & Control Panel (Vue 3/Pinia):** A unified Single Page Application for broadcaster control, including scene management, layout editing, and telestrator board.

## 2. Technical Constraints & Rules

### 2.1 Backend (Node.js)
*   **Single-Pass GSI Processing:** Logic iterating over `body.allplayers` must be consolidated into a single `O(n)` loop per tick to minimize event-loop blocking.
*   **Throttled Broadcasts:** WebSocket state updates must be capped at 20Hz (50ms) using a debounce/throttle mechanism.
*   **Enriched State:** The backend is responsible for maintaining historical metrics (e.g., probability swings) that the raw GSI does not provide.

### 2.2 Frontend (Overlay)
*   **Reactivity Hygiene:** Use `shallowRef` or `shallowReactive` for the raw GSI state object. Avoid deep-watching massive, nested GSI payloads to prevent performance degradation.
*   **Dynamic Styling:** Visual overrides (colors, positions) must be applied via CSS Custom Properties on the `:root` element.
*   **Scale Independence:** All layout calculations must respect the global `--scale-factor` variable, derived from the viewport height (`vh`) or width (`vw`).

### 2.3 Theme System
*   **De-coupled Components:** UI elements (Radar, FocusedPlayer, etc.) must be implemented as standalone components with clear boundaries.
*   **Native Modules:** Future themes should avoid backend string-concatenation of `.append` files. Prefer standard native ES Module imports or a structured build step.
*   **Schema Validation:** `theme.json` and `settings.json` must be validated against a strict JSON schema on startup.

## 3. UI/UX Standards (Config Dashboard)
*   **Unified SPA:** All configuration and live control tools must exist within a single Vue 3 application.
*   **Centralized State (Pinia):** Use Pinia to synchronize local state with the WebSocket server, ensuring that the Layout Editor and Options menus never overwrite each other with stale data.
*   **Broadcaster Ergonomics:**
    *   Optimistic UI updates for scene changes.
    *   Fabric.js integration for a smooth, vector-based telestrator experience.
    *   Clear visual feedback for "Unsaved Changes" and "Sync Status".

## 4. Security & Desktop Integration
*   **Electron Hardening:** All renderer windows must use `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
*   **Preload Bridge:** Use Electron's `contextBridge` to expose only necessary IPC channels between the main and renderer processes.
*   **GSI Authentication:** Strict validation of the GSI `auth.token` is mandatory.

## 5. Feature Bible
*   **Win Probability:** CT-favoring probability based on player count, HP ratios, and bomb plant status.
*   **Clutch King:** Calculated as the maximum positive probability swing between the lowest point in a round and the final win.
*   **Telestrator:** Real-time synchronized drawing board for broadcasters to annotate gameplay.
*   **Caster Action Alerts:** Real-time notifications for broadcasters/producers regarding critical game events (Planted, Defused, Multi-kills).
