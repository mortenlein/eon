import { additionalState, gsiState } from './state.js'
import { logRound } from './helpers/logger.js'

const gsiToken = process.env.GSI_TOKEN || '7ATvXUzTfBYyMLrA'
let lastGsiMeta = {
	acceptedAtUnixTimestamp: 0,
	authFailedAtUnixTimestamp: 0,
	lastError: null,
	lastMapName: null,
	lastPhase: null,
	lastUserAgent: null,
	requestCount: 0,
}

let lastBroadcastTs = 0
let broadcastTimer = null

const throttleBroadcast = (websocket) => {
	const now = Date.now()
	const elapsed = now - lastBroadcastTs

	if (elapsed >= 50) { // 20Hz
		lastBroadcastTs = now
		if (broadcastTimer) clearTimeout(broadcastTimer)
		websocket.broadcastState()
	} else if (! broadcastTimer) {
		broadcastTimer = setTimeout(() => {
			lastBroadcastTs = Date.now()
			broadcastTimer = null
			websocket.broadcastState()
		}, 50 - elapsed)
	}
}

export const registerGsiRoutes = (router, websocket) => {
	const handleGsiPost = (context) => {
		const userAgent = context.request.headers['user-agent'] || ''
		const body = context.request.body || {}
		const authToken = body.auth?.token
		lastGsiMeta.requestCount++
		console.log(`[GSI] Request received from ${userAgent} (Token: ${authToken})`);
		lastGsiMeta.lastUserAgent = userAgent || null

		if (gsiToken && authToken !== gsiToken) {
			lastGsiMeta.authFailedAtUnixTimestamp = Date.now()
			lastGsiMeta.lastError = 'auth_failed'
			return context.status = 401
		}

		const wasRoundFreezetime = gsiState.round?.phase === 'freezetime'
		const wasRoundLive = gsiState.round?.phase === 'live'
		const wasRoundOver = gsiState.round?.phase === 'over' || gsiState.round?.phase === 'timeout'

		updateGsiState(body)
		updateAdditionalState(body)

		// Clutch Logic: Initialize on round start
		if (gsiState.round?.phase === 'live' && !wasRoundLive) {
			additionalState.currentRoundProb = 0.5
			additionalState.probHistory = [0.5]
			additionalState.maxProbSwing = 0
			additionalState.roundKillStats = {}
		}

		// Update Probability during Live/Planted phase
		if (gsiState.round?.phase === 'live' || gsiState.map?.phase === 'live' || gsiState.bomb?.state === 'planted') {
			calculateWinProbability(body)
		}

		if (!wasRoundFreezetime && gsiState.round?.phase === 'freezetime') {
			updateMoneyAtStartOfRound(body)
			broadcastMvp(websocket)
		}

		// Logging & MVP tracking on round end
		if (gsiState.round?.phase === 'over' && !wasRoundOver) {
			handleRoundEnd(body)
		}

		if (wasRoundFreezetime && gsiState.round?.phase === 'live') {
			websocket.broadcastToWebsockets('MVP_DISPLAY', null) // Hide MVP card
		}

		lastGsiMeta.acceptedAtUnixTimestamp = Date.now()
		lastGsiMeta.lastError = null
		lastGsiMeta.lastMapName = body.map?.name || null
		lastGsiMeta.lastPhase = body.phase_countdowns?.phase || body.round?.phase || null

		// Throttle broadcasts to 20Hz (50ms) to save bandwidth and CPU
		throttleBroadcast(websocket)

		return context.status = 204
	}

	router.post('/gsi', handleGsiPost)
	router.post('/api/gsi', handleGsiPost)

	router.post('/api/gsi/status', (context) => {
		context.body = {
			gsiTokenConfigured: !!gsiToken,
			lastGsiMeta,
			hasMapState: !!gsiState.map,
			hasPlayerState: !!gsiState.player,
			mapName: gsiState.map?.name || null,
			phase: gsiState.phase_countdowns?.phase || gsiState.round?.phase || null,
		}
	})
}

export const getState = () => ({
	gsiState,
	additionalState,
	unixTimestamp: lastGsiMeta.acceptedAtUnixTimestamp
})

const updateGsiState = (body) => {
	let hasPlayer = false

	for (const [key, value] of Object.entries(body)) {
		switch (key) {
			case 'added':
			case 'auth':
			case 'previously':
				continue

			case 'player':
				hasPlayer = true
				// intentional fallthrough!

			default:
				gsiState[key] = value
		}
	}

	if (! hasPlayer) {
		gsiState.player = null
	}
}

const updateAdditionalState = (body) => {
	const { mapChanged } = updateLastKnownMapName(body)

	updateLastKnownBombPlantedCountdown(body)
	updateLastKnownPlayerObserverSlot(body)

	// clear some data on map change instead of updating
	if (mapChanged || body?.player?.activity === 'menu') {
		additionalState.roundDamages = {}
	} else {
		updateRoundDamages(body, mapChanged)
	}
}

const updateLastKnownMapName = (body) => {
	const previousMapName = additionalState.lastKnownMapName

	additionalState.lastKnownMapName = body.map?.name

	return {
		mapChanged: additionalState.lastKnownMapName !== previousMapName,
	}
}

const updateLastKnownBombPlantedCountdown = (body) => {
	const bomb = body.bomb
	if (bomb?.state === 'defusing') return

	if (! bomb || bomb.state !== 'planted') {
		additionalState.lastKnownBombPlantedCountdown = {}
		return
	}

	additionalState.lastKnownBombPlantedCountdown = {
		unixTimestamp: +new Date(),
		value: bomb.countdown,
	}
}

const updateLastKnownPlayerObserverSlot = (body) => {
	if (! body.allplayers) return

	for (const [steam64Id, player] of Object.entries(body.allplayers)) {
		if (player.observer_slot === null || player.observer_slot === undefined) continue
		additionalState.lastKnownPlayerObserverSlot[steam64Id] = player.observer_slot
	}
}

const updateMoneyAtStartOfRound = (body) => {
	additionalState.moneyAtStartOfRound = {}

	for (const [steam64Id, player] of Object.entries(body.allplayers || {})) {
		additionalState.moneyAtStartOfRound[steam64Id] = player.state.money
	}
}

const updateRoundDamages = (body, mapChanged) => {
	const roundNumber = body.map?.round + 1 - Number(body.phase_countdowns?.phase === 'over')
	if (! roundNumber) return

	for (const [steam64Id, player] of Object.entries(body.allplayers || {})) {
		if (! additionalState.roundDamages[steam64Id]) {
			additionalState.roundDamages[steam64Id] = {}
		}

		// CS2 (CS:GO maybe too) sometimes overwrites round_totaldmg with a zero once the player dies; work around that by ignoring zero if we already have a value set
		if (
			player.state.round_totaldmg !== 0
			|| ! additionalState.roundDamages[steam64Id].hasOwnProperty(roundNumber)
		) {
			additionalState.roundDamages[steam64Id][roundNumber] = player.state.round_totaldmg
		}
	}
}

const calculateWinProbability = (body) => {
	if (!body.allplayers) return

	let ctPlayers = 0, tPlayers = 0
	let ctHp = 0, tHp = 0

	for (const player of Object.values(body.allplayers)) {
		if (player.state.health <= 0) continue
		if (player.team === 'CT') {
			ctPlayers++
			ctHp += player.state.health
		} else {
			tPlayers++
			tHp += player.state.health
		}
	}

	if (ctPlayers + tPlayers === 0) return

	// Base prob from player count and HP
	const totalPlayers = ctPlayers + tPlayers
	const playerWeight = ctPlayers / totalPlayers
	const hpRatio = (ctHp + tHp) > 0 ? ctHp / (ctHp + tHp) : 0.5
	let prob = (playerWeight * 0.5) + (hpRatio * 0.5)

	// Bomb logic: If planted, probability for CT decays
	if (body.bomb?.state === 'planted') {
		const countdown = body.bomb.countdown || 40
		const bombFactor = Math.pow(countdown / 40, 2)
		prob = prob * bombFactor
	}

	additionalState.currentRoundProb = prob
	
	// Only record significant changes (>1%) to save memory and bandwidth
	const lastProb = additionalState.probHistory[additionalState.probHistory.length - 1]
	if (lastProb === undefined || Math.abs(prob - lastProb) > 0.01) {
		additionalState.probHistory.push(prob)
	}
}

const handleRoundEnd = (body) => {
	const winner = body.round?.win_team
	const roundNum = body.map?.round || 0
	const finalProb = winner === 'CT' ? 1.0 : 0.0
	
	const lowestProb = additionalState.probHistory.length > 0 ? Math.min(...additionalState.probHistory) : 0.5
	const highestProb = additionalState.probHistory.length > 0 ? Math.max(...additionalState.probHistory) : 0.5
	
	// Calculate swing
	if (winner === 'CT') {
		additionalState.maxProbSwing = finalProb - lowestProb
	} else {
		additionalState.maxProbSwing = highestProb - finalProb
	}

	// Logging
	logRound({
		round_num: roundNum,
		winner,
		mvp_player_name: body.player?.name || 'Unknown',
		clutch_metric: (additionalState.maxProbSwing * 100).toFixed(1) + '%',
		final_stats: body.allplayers || {}
	})
}

const broadcastMvp = (websocket) => {
	let mvpId = null
	let maxScore = -1

	for (const [id, damages] of Object.entries(additionalState.roundDamages)) {
		const roundNum = Object.keys(damages).sort((a,b) => b-a)[0]
		if (!roundNum) continue
		const dmg = damages[roundNum] || 0
		if (dmg > maxScore) {
			maxScore = dmg
			mvpId = id
		}
	}

	if (mvpId && gsiState.allplayers?.[mvpId]) {
		const player = gsiState.allplayers[mvpId]
		websocket.broadcastToWebsockets('MVP_DISPLAY', {
			name: player.name,
			title: additionalState.maxProbSwing > 0.4 ? 'Clutch King' : 'Top Performer',
			swingPct: (additionalState.maxProbSwing * 100).toFixed(0),
			kills: player.match_stats?.kills || 0
		})
	}
}
