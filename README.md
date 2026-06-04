# Eon

Production-oriented Counter-Strike 2 broadcast HUD tooling for LANs, streams, observer stations, and league intermission scenes.

Eon is a local Node/Koa server that receives CS2 Game State Integration (GSI), enriches the match state, broadcasts updates over websockets, and serves the HUD, config UI, radar, and Electron launchers.

## Current Product Surface

- Broadcast HUD at `/hud`
- Operator config SPA at `/config`
- Standalone radar view at `/radar`
- CS2 GSI ingestion on `/gsi` and `/api/gsi`
- Websocket-backed HUD/config/radar state
- `raw` base theme plus active `default` theme and `userspace` overrides
- Style presets in the default theme: Slanted, Classic, Compact, Diagonal, and Rounded
- Live control tools for match scenes, telestrator, win-probability control, team overrides, series setup, rules, sponsors, layout, and HUD options
- Komplettligaen intermission scenes backed by GG Arena match/table/team-games data
- Electron launchers for overlay, config, and radar windows

## Quick Start

```powershell
npm install
npm start
```

Useful scripts:

```powershell
npm start
npm run start:ui-dev
npm run overlay
npm run config
npm run radar
npm run start:all
npm run start:broadcast
```

## Default URLs

- `http://127.0.0.1:31982/`
- `http://127.0.0.1:31982/hud`
- `http://127.0.0.1:31982/hud?transparent`
- `http://127.0.0.1:31982/config`
- `http://127.0.0.1:31982/radar`
- `http://127.0.0.1:31982/api/gsi/status`
- `http://127.0.0.1:31982/api/komplettligaen`

## GSI Setup

Copy `gamestate_integration_eon.cfg` into your CS2 `game/csgo/cfg` directory, then restart CS2.

The server accepts GSI on:

- `/gsi`
- `/api/gsi`

## Project Structure

- `src/server` contains the Koa server, GSI endpoints, websocket fanout, settings/theme loading, config routes, radar routes, and Komplettligaen integration
- `src/config` contains the Vue 3 operator SPA and shared websocket-backed store
- `src/radar` contains the standalone radar view
- `src/electron` contains the Electron overlay/config/radar launchers
- `src/themes/raw` contains the base parser, websocket client, and raw theme foundation
- `src/themes/default` contains the active broadcast HUD theme, presets, assets, and intermission scenes
- `src/themes/userspace` is generated/used for local operator overrides
- `public` contains static public assets
- `docs` contains bundled reference documentation
- `tmp` contains current visual references and issue screenshots

## Local Customization

- Built-in theme settings live in `src/themes/default/theme.json`
- Local operator overrides live in `src/themes/userspace`
- Uploaded HUD fonts are stored under `src/themes/userspace/fonts`
- Komplettligaen config is stored separately in `src/themes/userspace/komplettligaen.json`
- The active HUD theme chain is `userspace -> default -> raw`

## Environment

The server and Electron launchers support:

- `HOST`
- `PORT`
- `GSI_TOKEN`
- `EON_UI_DEV_MODE`
- `UI_DEV_MODE`

## UI Dev Mode

Run `npm run start:ui-dev` to serve a static in-round match state without CS2.
The HUD, radar, and config UI still use the normal websocket and parser path, but live GSI posts are ignored so the layout stays stable while you work.

You can also enable it with `node . --ui-dev-mode` or `EON_UI_DEV_MODE=1`.

## Current Focus

The main product direction is the `default` theme and its broadcast-card visual system. The current open documentation/task focus is a fresh visual pass on Compact/Classic sidebar whitespace, spectator-state issues captured in `tmp`, and regression verification across HUD presets and intermission scenes.
