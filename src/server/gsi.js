import fs from 'fs'
import path from 'path'
import { additionalState, gsiState } from './state.js'
import { logRound } from './helpers/logger.js'
import { isUiDevMode } from './dev-mode.js'

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
		lastGsiMeta.lastUserAgent = userAgent || null

		if (isUiDevMode) {
			lastGsiMeta.lastError = 'ui_dev_mode_ignored'
			return context.status = 204
		}

		if (gsiToken && authToken !== gsiToken) {
			lastGsiMeta.authFailedAtUnixTimestamp = Date.now()
			lastGsiMeta.lastError = 'auth_failed'
			return context.status = 401
		}

		const wasRoundFreezetime = gsiState.round?.phase === 'freezetime'
		const wasRoundLive = gsiState.round?.phase === 'live'
		const wasRoundOver = gsiState.round?.phase === 'over' || gsiState.round?.phase === 'timeout'
		
		const wasBombPlanted = gsiState.bomb?.state === 'planted'

		updateGsiState(body)
		
		const { mapChanged } = updateLastKnownMapName(body)
		updateLastKnownBombPlantedCountdown(body)

		// Caster Alerts
		if (body.bomb?.state === 'planted' && !wasBombPlanted) {
			websocket.broadcastToWebsockets('CASTER_ALERT', { message: 'Bomb Planted', type: 'warning' })
		} else if (body.bomb?.state === 'defused' && gsiState.bomb?.state !== 'defused') {
			websocket.broadcastToWebsockets('CASTER_ALERT', { message: 'Bomb Defused', type: 'success' })
		}

		// Clutch Logic: Initialize on round start
		if (gsiState.round?.phase === 'live' && !wasRoundLive) {
			additionalState.currentRoundProb = 0.5
			additionalState.probHistory = [0.5]
			additionalState.maxProbSwing = 0
			additionalState.roundKillStats = {}
		}

		// Combined Player Processing pass
		processAllPlayers(body, mapChanged)

		if (!wasRoundFreezetime && gsiState.round?.phase === 'freezetime') {
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
			uiDevMode: isUiDevMode,
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

const processAllPlayers = (body, mapChanged) => {
	if (! body.allplayers) return

	const isFreezetime = body.round?.phase === 'freezetime'
	const isLive = body.round?.phase === 'live' || body.map?.phase === 'live' || body.bomb?.state === 'planted'
	const roundNumber = body.map?.round + 1 - Number(body.phase_countdowns?.phase === 'over')

	// 1. Reset round damages on map change or menu
	if (mapChanged || body?.player?.activity === 'menu') {
		additionalState.roundDamages = {}
	}

	if (isFreezetime) {
		additionalState.moneyAtStartOfRound = {}
	}

	let ctPlayers = 0, tPlayers = 0
	let ctHp = 0, tHp = 0

	for (const [steam64Id, player] of Object.entries(body.allplayers)) {
		// A. Observer Slot
		if (player.observer_slot !== null && player.observer_slot !== undefined) {
			additionalState.lastKnownPlayerObserverSlot[steam64Id] = player.observer_slot
		}

		// B. Money at start
		if (isFreezetime) {
			additionalState.moneyAtStartOfRound[steam64Id] = player.state.money
		}

		// C. Round Damages
		if (roundNumber) {
			if (! additionalState.roundDamages[steam64Id]) {
				additionalState.roundDamages[steam64Id] = {}
			}
			if (player.state.round_totaldmg !== 0 || ! additionalState.roundDamages[steam64Id].hasOwnProperty(roundNumber)) {
				additionalState.roundDamages[steam64Id][roundNumber] = player.state.round_totaldmg
			}
		}

		// D. Win Prob Accumulators
		if (isLive && player.state.health > 0) {
			if (player.team === 'CT') {
				ctPlayers++
				ctHp += player.state.health
			} else {
				tPlayers++
				tHp += player.state.health
			}
		}
	}

	// 2. Finalize Win Probability
	if (isLive && (ctPlayers + tPlayers > 0)) {
		const totalPlayers = ctPlayers + tPlayers
		const playerWeight = ctPlayers / totalPlayers
		const hpRatio = (ctHp + tHp) > 0 ? ctHp / (ctHp + tHp) : 0.5
		let prob = (playerWeight * 0.5) + (hpRatio * 0.5)

		if (body.bomb?.state === 'planted') {
			const countdown = body.bomb.countdown || 40
			const bombFactor = Math.pow(countdown / 40, 2)
			prob = prob * bombFactor
		}

		additionalState.currentRoundProb = prob
		const lastProb = additionalState.probHistory[additionalState.probHistory.length - 1]
		if (lastProb === undefined || Math.abs(prob - lastProb) > 0.01) {
			additionalState.probHistory.push(prob)
		}
	}
}

const HIGHLIGHT_LOG_DIR = path.join(process.cwd(), 'logs')
const HIGHLIGHT_LOG_PATH = path.join(HIGHLIGHT_LOG_DIR, 'highlights.txt')

// Ensure directory exists
if (!fs.existsSync(HIGHLIGHT_LOG_DIR)) {
	fs.mkdirSync(HIGHLIGHT_LOG_DIR, { recursive: true })
}

// Helper to log highlights locally
const logHighlight = (roundNum, clutchMetric, mvpName) => {
	const logLine = `[${new Date().toISOString()}] Round ${roundNum} | Huge Swing: ${clutchMetric} | Clutch King: ${mvpName}\n`
	fs.appendFile(HIGHLIGHT_LOG_PATH, logLine, (err) => {
		if (err) console.error('Failed to write highlight log', err)
	})
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

	const mvpName = body.player?.name || 'Unknown'
	const clutchMetric = (additionalState.maxProbSwing * 100).toFixed(1) + '%'

	if (additionalState.maxProbSwing > 0.6) {
		logHighlight(roundNum, clutchMetric, mvpName)
	}

	// Logging
	logRound({
		round_num: roundNum,
		winner,
		mvp_player_name: mvpName,
		clutch_metric: clutchMetric,
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
