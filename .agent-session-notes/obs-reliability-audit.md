# Session Summary: OBS/Browser-Source Reliability Audit

**Date**: 2026-05-21  
**Topic**: OBS/Browser-Source Production Reliability and Recovery Behavior  

## 1. Summary of Work Done
- **Objective**: Conducted a production-reliability audit to identify how the Eon CS2 HUD behaves during CS2 crashes, GSI interruptions, network drops, server restarts, and heavy hardware-induced frame rate slowdowns.
- **Outcome**: mapped the full data ingestion topology, analyzed six major failure modes, documented existing visual/operational behaviors, and formulated a surgical resolution plan to guarantee operator confidence.
- **Deliverable**: Generated a detailed, master-level audit report at `C:\Users\morte\.gemini\antigravity\brain\441adbaf-2deb-42d9-926e-d70ef08aa214\obs_reliability_audit_report.md`.

## 2. Key Findings & Diagnostic Analysis
1. **Silent Freezing (The CS2 Crash Issue)**: When `CS2.exe` crashes, HTTP POSTs to the server stop. Since the server does not monitor heartbeat timeout, the last state remains stuck in memory. The websocket remains open and healthy, and the client-side HUD stays frozen on the last active match frame rather than falling back to the standby screen.
2. **WebSocket Batch Bottleneck (Low-FPS Lag)**: In high-load streaming/gaming scenarios where OBS throttles the browser source's frame rate, multiple GSI update packets accumulate in the client-side message queue. When `requestAnimationFrame` finally fires, the HUD parses and reactively executes Vue state updates sequentially for **all** buffered packets. This causes compounding CPU lag and risk of OBS Chromium crashes.
3. **Missing Status Indicators**: The HUD UI lacks reactive connection diagnostics. If the websocket is down or GSI is stale, the overlay silently freezes with no diagnostic indicators.
4. **Endpoint Usability**: The GSI status endpoint (`/api/gsi/status`) is registered as a `POST` method, preventing operators from checking health using standard GET web requests.

## 3. Files Inspected
- `src/server/index.js`
- `src/server/gsi.js`
- `src/server/websocket.js`
- `src/server/state.js`
- `src/themes/raw/core/websocket.js`
- `src/themes/raw/core/websocket-on-message.js`
- `src/themes/raw/core/websocket-events/state.js`
- `src/themes/raw/core/parse-gsi-state.js`
- `src/themes/default/shell/shell.js`
- `src/themes/default/shell/shell.html`

## 4. Recommended Recovery Hardening Tasks
1. **Client-Side Squelching**: Refactor `processWsQueue` in `websocket-on-message.js` to parse batch queue items and call `handleState()` **only** on the latest state-update event, bypassing obsolete middle frames while preserving event alerts.
2. **Server-Side Heartbeat**: Add a 1-second `setInterval` in `gsi.js` to monitor the age of `lastGsiMeta.acceptedAtUnixTimestamp`. If it exceeds 5 seconds, flip `additionalState.gsiActive = false` and broadcast it.
3. **GET Uptime Diagnostics**: Introduce `GET /api/status` for quick, browser-based operator diagnostics.
