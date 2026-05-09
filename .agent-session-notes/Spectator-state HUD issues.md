# Spectator-state HUD issues

Date: 2026-05-09

Task selected: Spectator-state HUD issues.

Project memory read:
- `overview.md`
- `architecture.md`
- `tasks.md`

Reference screenshots reviewed:
- `tmp/Classic-specator-issue.png`
- `tmp/compact-spectator-issues.png`
- `tmp/default-issues-spectator.png`
- `tmp/diagonal-specator-issues.png`
- `tmp/rounded-specator-issues.png`

Change made:
- Updated `src/themes/default/focused-player/focused-player.css`.
- Prevented focused-player health and armor readouts from wrapping in narrow spectator-state panels.
- Gave Compact focused-player vitals more room and slightly smaller type so health plus armor can remain deliberate instead of collapsing into stacked digits.
- Changed the optional focused-player bottom overlay image to block layout so it does not behave like inline content.

Assumption:
- The captured spectator-state issue is in the focused-player card layout, not in GSI parsing, sidebars, or top-bar state.

Verification:
- Ran `git diff --check`.
- Did not run npm, package, or dev-server commands per instruction.

Notes:
- `git diff --check` reported only the existing Git line-ending warning for `focused-player.css` being normalized to CRLF when Git touches it.
