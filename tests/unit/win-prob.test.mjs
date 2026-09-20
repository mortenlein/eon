import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { engineer, predictCt, featuresFromGsi, heuristicCt, winProbCt, hasModel } from '../../src/server/win-prob.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtures = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'winprob-fixtures.json'), 'utf8'))

test('model file loads', () => {
	assert.equal(hasModel(), true)
	assert.equal(engineer(fixtures.cases[0].x).length, 51)
})

test('JS port reproduces the Python fit on every fixture state', () => {
	for (const c of fixtures.cases) {
		const p = predictCt(c.x)
		assert.ok(Math.abs(p - c.p_ct) < 1e-6, `state ${JSON.stringify(c.x)}: js ${p} vs python ${c.p_ct}`)
	}
})

const player = (team, health, equip = 4000) => ({ team, state: { health, equip_value: equip } })
const body = (over) => ({
	map: { name: 'de_mirage', round: 5, phase: 'live' },
	round: { phase: 'live' },
	phase_countdowns: { phase: 'live', phase_ends_in: '80.5' },
	bomb: null,
	allplayers: {
		a: player('CT', 100), b: player('CT', 100), c: player('CT', 100), d: player('CT', 100), e: player('CT', 100),
		f: player('T', 100), g: player('T', 100), h: player('T', 100), i: player('T', 100), j: player('T', 100),
	},
	...over,
})

test('features from a live GSI body', () => {
	const x = featuresFromGsi(body())
	assert.deepEqual(x.slice(0, 4), [5, 5, 5, 5])
	assert.ok(Math.abs(x[4] - 80.5 / 115) < 1e-9, 'time_left from phase_ends_in')
	assert.equal(x[5], 0)
	assert.equal(x[6], 0)
	assert.equal(x[7], 20)
	assert.equal(x[9], 0, 'round 6 is not a pistol round')
	assert.ok(Math.abs(x[10] - 0.529) < 1e-9, 'mirage CT rate')
})

test('planted bomb: clock replaced by the bomb countdown, T favoured', () => {
	const b = body({ bomb: { state: 'planted', countdown: '30.0' } })
	const x = featuresFromGsi(b)
	assert.equal(x[5], 1)
	assert.ok(Math.abs(x[6] - 0.75) < 1e-9)
	assert.equal(x[4], 0)
	const open = winProbCt(body())
	const planted = winProbCt(b)
	assert.ok(planted < open, `5v5 post-plant (${planted}) should favour T over the open (${open})`)
})

test('man advantage moves the number the right way, and the model beats the formula at the extremes', () => {
	const ctUp = body({ allplayers: { ...body().allplayers, f: player('T', 0), g: player('T', 0) } })
	const p = winProbCt(ctUp)
	assert.ok(p > 0.75 && p < 0.99, `5v3 for CT should be a strong CT edge, got ${p}`)
	assert.ok(p > heuristicCt(ctUp), 'the formula is timid on a man advantage')
	const tUp = body({ allplayers: { ...body().allplayers, a: player('CT', 0), b: player('CT', 0), c: player('CT', 0) } })
	assert.ok(winProbCt(tUp) < 0.2)
})

test('pistol rounds and equipment at round start are honoured', () => {
	const x = featuresFromGsi(body({ map: { name: 'de_inferno', round: 0, phase: 'live' } }), { equipAtStart: { ct: 4300, t: 3600 } })
	assert.equal(x[9], 1)
	assert.ok(Math.abs(x[7] - 4.3) < 1e-9 && Math.abs(x[8] - 3.6) < 1e-9)
	assert.ok(Math.abs(x[10] - 0.510) < 1e-9)
})
