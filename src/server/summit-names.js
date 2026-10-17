/**
 * Summit names — pulls team and player names for the match being played from Summit
 * (GET {url}/api/eon/matches) so the HUD names itself without hand-typed overrides.
 *
 * Uses the same bridge config as apexplay-bridge.js (enabled/url/token). Polls every ~5s
 * while the bridge is enabled. Summit's lines are kept as a separate layer in
 * additionalState.summitNames; the HUD consults the operator's manual
 * teams.playerNameOverrides / teams.teamNameOverrides first, so manual entries always win
 * and are never written to or erased.
 *
 * Which match: the one whose players are actually on the server (steamids in GSI allplayers,
 * at least one from each team) wins, so it works even if nobody clicked "live" in Summit.
 * Otherwise Summit's `current`. If neither gives a match the last applied names stay put,
 * so the HUD doesn't blank between matches. Errors are logged once per kind and swallowed;
 * nothing here touches the GSI hot path.
 */
import { loadConfig } from './apexplay-bridge.js'
import { additionalState, gsiState } from './state.js'

const pollMs = 5000
const timeoutMs = 3000

let lastLoggedError = null
let inFlight = false
let inFlightSince = 0
// a poll that never settles (2026-10-17: names froze on the previous match for the whole
// next one) must not block every poll after it - give up on it after this long
const stuckMs = 15000

const logOnce = (key, message) => {
	if (lastLoggedError === key) return
	lastLoggedError = key
	console.warn(`[summit] ${message}`)
}

const steamIdsOf = (team) => (team?.players || []).map((player) => String(player.steamId || '')).filter(Boolean)

// the match with the most of its players on the server, needing both teams represented;
// a tie means we can't tell, so no pick
const matchOnServer = (matches) => {
	const onServer = new Set(Object.keys(gsiState?.allplayers || {}))
	if (!onServer.size) return null

	let best = null
	let bestCount = 0
	let tied = false
	for (const match of matches || []) {
		const home = steamIdsOf(match.home).filter((id) => onServer.has(id)).length
		const away = steamIdsOf(match.away).filter((id) => onServer.has(id)).length
		if (!home || !away) continue
		if (home + away > bestCount) { best = match; bestCount = home + away; tied = false }
		else if (home + away === bestCount) tied = true
	}
	return tied ? null : best
}

// per-map results ([{ map: 'de_inferno', home, away }], Summit's home/away, live during the
// match) for the BO3 series row. /api/eon/matches carries them as match.mapScores; until that
// is deployed everywhere, fall back to the public tournament API
const fetchMapScores = async (cfg, tournamentId, matchId) => {
	if (!tournamentId || !matchId) return []
	try {
		const endpoint = `${cfg.url.replace(/\/+$/, '')}/api/tournaments/${tournamentId}/matches`
		const response = await fetch(endpoint, { signal: AbortSignal.timeout(timeoutMs) })
		if (!response.ok) return []
		const match = (await response.json()).find?.((m) => m.id === matchId)
		const mapScores = typeof match?.mapScores === 'string' ? JSON.parse(match.mapScores) : match?.mapScores
		return Array.isArray(mapScores) ? mapScores : []
	} catch {
		return [] // the series row just stays empty
	}
}

const applyMatch = (match, source, mapScores = []) => {
	const next = {
		matchId: match.id || null,
		stage: match.stage || null,
		home: match.home?.name || null,
		away: match.away?.name || null,
		bestOf: Number(match.bestOf) || 1,
		maps: Array.isArray(match.maps) ? match.maps : [],
		mapScores,
		playerNameOverrides: match.eon?.playerNameOverrides || '',
		teamNameOverrides: match.eon?.teamNameOverrides || '',
	}

	const { source: _prevSource, ...prev } = additionalState.summitNames || {}
	if (JSON.stringify(prev) === JSON.stringify(next)) return

	const namesChanged = prev.matchId !== next.matchId
		|| prev.playerNameOverrides !== next.playerNameOverrides
		|| prev.teamNameOverrides !== next.teamNameOverrides
	additionalState.summitNames = { ...next, source }
	if (namesChanged) console.log(`[summit] names applied: ${next.home} vs ${next.away} (${next.stage || 'match'}, BO${next.bestOf}, via ${source})`)
}

const poll = async () => {
	const cfg = loadConfig()
	if (!cfg.enabled || !cfg.url || !cfg.token) return
	if (inFlight && Date.now() - inFlightSince < stuckMs) return
	if (inFlight) logOnce('stuck', `previous poll still pending after ${stuckMs / 1000}s - starting a new one`)

	inFlight = true
	inFlightSince = Date.now()
	try {
		const endpoint = cfg.url.replace(/\/+$/, '') + '/api/eon/matches'
		const response = await fetch(endpoint, {
			headers: { Authorization: `Bearer ${cfg.token}` },
			signal: AbortSignal.timeout(timeoutMs),
		})

		if (response.status === 401) {
			logOnce('401', 'GET /api/eon/matches returned 401 - the bridge token is wrong or has been rotated')
			return
		}
		if (!response.ok) {
			logOnce(`http-${response.status}`, `GET /api/eon/matches returned ${response.status}`)
			return
		}

		const body = await response.json()
		lastLoggedError = null
		const onServer = matchOnServer(body?.matches)
		const match = onServer || body?.current
		if (match) {
			const mapScores = Array.isArray(match.mapScores) ? match.mapScores
				: match.bestOf > 1 ? await fetchMapScores(cfg, body?.tournament?.id, match.id)
				: []
			applyMatch(match, onServer ? 'players on server' : 'summit current', mapScores)
		}
	} catch (err) {
		logOnce(err?.name || 'error', `polling failed: ${err?.message || err}`)
	} finally {
		inFlight = false
	}
}

export const startSummitNamePoller = () => {
	setInterval(poll, pollMs).unref()
	poll()
}
