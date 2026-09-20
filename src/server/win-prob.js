// win-prob.js - in-round CT win probability for the HUD graph.
//
// Replaces the hand formula (alive share + health share, squared bomb factor)
// that was off by 9 percentage points on average and systematically timid at
// the extremes (a side shown at 60-70% actually won 87% of the time). This is
// a logistic model fitted in eon-director on 3.57M reconstructed game states
// from 7,711 Komplettligaen matches and judged on 120 held-out Ancient matches:
// calibration error 1.3 points, 26% less squared error. It generalises to maps
// it never saw (held-out Mirage 1.5 pts, Inferno 2.3 pts vs 11-12 for the
// formula). Evidence: eon-director logs/night7-16/VERDICT-winprob-v1.md.
//
// Every input is something the live GSI feed carries. The feature vector and
// the engineered terms MUST stay identical to fit_winprob.engineer() in
// eon-director - tests/unit/win-prob.test.mjs holds Python-computed fixtures.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
let MODEL = null
try {
	MODEL = JSON.parse(fs.readFileSync(path.join(here, 'data', 'winprob-logistic.json'), 'utf8'))
} catch (err) {
	console.warn('[win-prob] model file missing, falling back to the alive/hp formula:', err.message)
}

const ROUND_S = MODEL?.round_seconds ?? 115
const BOMB_S = MODEL?.bomb_seconds ?? 40
const PISTOL_ROUNDS = new Set([1, 13]) // MR12 halves

export const hasModel = () => !!MODEL

/** Map a CS2 map name to the training-set CT base rate (default for unknown maps and Ancient). */
export const mapCtRate = (mapName) => {
	if (!MODEL) return 0.517
	const key = String(mapName || '').toLowerCase()
	return MODEL.map_ct_rate[key] ?? MODEL.default_ct_rate
}

/**
 * The 51 engineered terms - mirror of fit_winprob.engineer() (Python).
 * x = [alive_ct, alive_t, hp_ct, hp_t, time_left, planted, bomb_left, equip_ct, equip_t, pistol, map_ct_rate]
 * hp sums are in units of 100 (5 full players = 5.0); equipment in thousands.
 */
export const engineer = (x) => {
	const [aCt, aT, hpCt, hpT, timeLeft, planted, bombLeft, equipCt, equipT, pistol, rate] = x
	const tot = hpCt + hpT
	const share = tot > 0 ? hpCt / Math.max(tot, 1e-6) : 0.5
	const cols = [
		aCt, aT, aCt - aT, hpCt, hpT, share, timeLeft, planted, bombLeft,
		planted * (aCt - aT), planted * bombLeft * (aCt - aT), equipCt - equipT, pistol, rate,
		timeLeft * (aCt - aT),
	]
	const onehot = new Array(36).fill(0)
	const ci = Math.min(5, Math.max(0, Math.round(aCt)))
	const ti = Math.min(5, Math.max(0, Math.round(aT)))
	onehot[ci * 6 + ti] = 1
	return cols.concat(onehot)
}

/** P(CT wins the round) for a raw 11-feature state. Null when no model is loaded. */
export const predictCt = (x) => {
	if (!MODEL) return null
	const e = engineer(x)
	let z = MODEL.intercept
	for (let i = 0; i < e.length; i++) {
		z += ((e[i] - MODEL.mu[i]) / MODEL.sd[i]) * MODEL.coef[i]
	}
	const p = z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z))
	return Math.min(0.9999, Math.max(0.0001, p))
}

/**
 * Build the feature state from a live GSI body. `equipAtStart` is the per-side
 * equipment value captured at the end of freezetime ({ct, t} in dollars); when
 * absent the current equip values of living players stand in.
 */
export const featuresFromGsi = (body, { roundNumber, equipAtStart } = {}) => {
	let aCt = 0, aT = 0, hpCt = 0, hpT = 0, eqCt = 0, eqT = 0
	for (const p of Object.values(body.allplayers || {})) {
		if (!p?.state || !(p.state.health > 0)) continue
		if (p.team === 'CT') { aCt++; hpCt += p.state.health; eqCt += p.state.equip_value ?? 0 }
		else if (p.team === 'T') { aT++; hpT += p.state.health; eqT += p.state.equip_value ?? 0 }
	}
	const planted = body.bomb?.state === 'planted' || body.bomb?.state === 'defusing'
	let timeLeft = 0
	let bombLeft = 0
	if (planted) {
		const cd = Number(body.bomb?.countdown)
		bombLeft = Number.isFinite(cd) ? Math.min(1, Math.max(0, cd / BOMB_S)) : 0.5
	} else {
		const left = Number(body.phase_countdowns?.phase_ends_in)
		const live = body.phase_countdowns?.phase === 'live' || body.round?.phase === 'live'
		timeLeft = live && Number.isFinite(left) ? Math.min(1, Math.max(0, left / ROUND_S)) : 1
	}
	const equipCt = (equipAtStart?.ct ?? eqCt) / 1000
	const equipT = (equipAtStart?.t ?? eqT) / 1000
	const rn = Number.isFinite(roundNumber) ? roundNumber : (body.map?.round ?? 0) + 1
	return [aCt, aT, hpCt / 100, hpT / 100, timeLeft, planted ? 1 : 0, bombLeft, equipCt, equipT,
		PISTOL_ROUNDS.has(rn) ? 1 : 0, mapCtRate(body.map?.name)]
}

/** The old formula, kept as the fallback and for A/B logging. */
export const heuristicCt = (body) => {
	let ctPlayers = 0, tPlayers = 0, ctHp = 0, tHp = 0
	for (const p of Object.values(body.allplayers || {})) {
		if (!p?.state || !(p.state.health > 0)) continue
		if (p.team === 'CT') { ctPlayers++; ctHp += p.state.health } else if (p.team === 'T') { tPlayers++; tHp += p.state.health }
	}
	const total = ctPlayers + tPlayers
	if (total === 0) return null
	const hpRatio = (ctHp + tHp) > 0 ? ctHp / (ctHp + tHp) : 0.5
	let prob = (ctPlayers / total) * 0.5 + hpRatio * 0.5
	if (body.bomb?.state === 'planted') {
		const countdown = body.bomb.countdown || 40
		prob *= Math.pow(countdown / 40, 2)
	}
	return prob
}

/** P(CT wins) from a live GSI body: the model when loaded, else the formula. */
export const winProbCt = (body, opts = {}) => {
	if (MODEL) {
		try {
			return predictCt(featuresFromGsi(body, opts))
		} catch (err) {
			console.warn('[win-prob] model failed, using the formula:', err.message)
		}
	}
	return heuristicCt(body)
}
