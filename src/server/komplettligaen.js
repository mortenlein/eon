import { mkdir } from 'fs/promises'
import { join } from 'path'

import { readJsonIfExists, writeJson } from './helpers/json-file.js'
import { userspaceDirectory } from './helpers/paths.js'
import {
	scrapeMatch,
	scrapeTable,
	scrapeTeamGames,
} from './integrations/komplettligaen/scraper.js'
import { isUiDevMode } from './dev-mode.js'

const configPath = join(userspaceDirectory, 'komplettligaen.json')
const cache = new Map()
const ttlMs = 60 * 1000

const defaultConfig = {
	matchId: '',
	activeView: 'match',
}

const readConfig = async () => ({
	...defaultConfig,
	...(await readJsonIfExists(configPath)),
})

const cached = async (key, fetcher) => {
	const hit = cache.get(key)
	if (hit && Date.now() - hit.createdAt < ttlMs) return hit.value

	const value = await fetcher()
	cache.set(key, { createdAt: Date.now(), value })
	return value
}

const getMockMatch = () => ({
	id: 'mock-123',
	division: '1. Divisjon',
	round: 'Runde 8',
	startsAt: new Date().toISOString(),
	bestOf: 3,
	home: { 
		name: 'Ember', 
		logo: '/hud/img/logos/t.png', 
		score: 0,
		stats: [
			{ name: 'Astra', kills: 22, assists: 4, deaths: 18, rating: '1.24' },
			{ name: 'Bolt', kills: 18, assists: 6, deaths: 19, rating: '1.05' },
			{ name: 'Cipher', kills: 15, assists: 3, deaths: 20, rating: '0.88' },
			{ name: 'Drift', kills: 12, assists: 2, deaths: 21, rating: '0.72' },
			{ name: 'Echo', kills: 9, assists: 8, deaths: 22, rating: '0.65' }
		]
	},
	away: { 
		name: 'Nord', 
		logo: '/hud/img/logos/ct.png', 
		score: 1,
		stats: [
			{ name: 'Frost', kills: 26, assists: 2, deaths: 14, rating: '1.45' },
			{ name: 'Ghost', kills: 21, assists: 8, deaths: 15, rating: '1.32' },
			{ name: 'Haze', kills: 19, assists: 4, deaths: 16, rating: '1.18' },
			{ name: 'Ion', kills: 16, assists: 5, deaths: 17, rating: '1.02' },
			{ name: 'Juno', kills: 14, assists: 7, deaths: 18, rating: '0.94' }
		]
	},
	maps: [
		{ name: 'Mirage', image: '/hud/img/maps/de_mirage.png', status: 'finished', homeScore: 13, awayScore: 16, finished: true, winner: 'away' },
		{ name: 'Anubis', image: '/hud/img/maps/de_anubis.png', status: 'live', homeScore: 9, awayScore: 8, finished: false },
		{ name: 'Ancient', image: '/hud/img/maps/de_ancient.png', status: 'scheduled', homeScore: null, awayScore: null, finished: false }
	],
	currentMap: { name: 'Anubis', image: '/hud/img/maps/de_anubis.png', homeScore: 9, awayScore: 8, finished: false }
})

const getBundle = async (matchId, teamId = null) => {
	if ((!matchId || String(matchId).startsWith('mock-')) && isUiDevMode) {
		return {
			match: getMockMatch(),
			table: null,
			teamGames: null,
			generatedAt: new Date().toISOString()
		}
	}
	if (!matchId) return { match: null, table: null, teamGames: null }

	const match = await cached(`match:${matchId}`, () => scrapeMatch(matchId))
	const divisionId = match.divisionId || undefined
	const table = await cached(`table:${divisionId || 'default'}:${match.division}`, () => scrapeTable(divisionId, match.division))
	const teamGames = await cached(`team-games:${matchId}:${teamId || ''}`, () => scrapeTeamGames(matchId, teamId))

	return {
		match,
		table,
		teamGames,
		generatedAt: new Date().toISOString(),
	}
}

export const registerKomplettligaenRoutes = (router, websocket) => {
	router.get('/config/komplettligaen', async (context) => {
		context.body = await readConfig()
	})

	router.put('/config/komplettligaen', async (context) => {
		const current = await readConfig()
		const incoming = context.request.body || {}
		const config = {
			...current,
			matchId: String(incoming.matchId ?? current.matchId ?? '').trim(),
			activeView: String(incoming.activeView ?? current.activeView ?? defaultConfig.activeView),
		}

		await mkdir(userspaceDirectory, { recursive: true })
		await writeJson(configPath, config)
		websocket.broadcastRefresh()
		context.body = config
	})

	router.get('/api/komplettligaen', async (context) => {
		const config = await readConfig()
		context.body = {
			config,
			data: await getBundle(config.matchId, context.query.teamId),
		}
	})

	router.get('/api/komplettligaen/preview', async (context) => {
		const matchId = String(context.query.matchId || '').trim()
		if (!matchId) {
			context.status = 400
			context.body = { error: 'matchId is required' }
			return
		}

		context.body = await getBundle(matchId, context.query.teamId)
	})

	router.post('/config/komplettligaen/refresh', async (context) => {
		cache.clear()
		context.status = 204
	})
}
