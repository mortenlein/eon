# Eon

Production-oriented Counter-Strike 2 broadcast HUD tooling for LANs, streams, and observer stations.

This repo contains a self-contained HUD stack with:

- broadcast HUD at `/hud`
- config UI at `/config`
- radar view at `/radar`
- local GSI ingestion over HTTP
- websocket-backed HUD state
- theme inheritance with operator overrides
- Electron launchers for overlay, config, and radar

## Quick Start

```powershell
npm install
npm start
```

Useful scripts:

```powershell
npm start
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

## GSI Setup

Copy `gamestate_integration_eon.cfg` into your CS2 `game/csgo/cfg` directory, then restart CS2.

The server accepts GSI on:

- `/gsi`
- `/api/gsi`

## Project Structure

- `src/server` contains the HUD server, GSI endpoints, and websocket state fanout
- `src/config` contains the operator config UI
- `src/radar` contains the standalone radar view
- `src/electron` contains the Electron overlay launchers
- `src/themes` contains the base themes and userspace overrides
- `public` contains static public assets
- `docs` contains bundled reference documentation

## Local Customization

- Default theme settings live in `src/themes`
- Local operator overrides live in `src/themes/userspace`
- The active LAN theme in this fork is `lan66nord`

## Environment

The server and Electron launchers support standard runtime environment variables such as:

- `HOST`
- `PORT`
- `GSI_TOKEN`

## Repo Bootstrap

To start this as a fresh standalone repo:

1. Run `git init`
2. Run `npm install`
3. Start the server with `npm start`
4. Verify `http://127.0.0.1:31982/config`
5. Copy the GSI config into CS2 and restart the game
