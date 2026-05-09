import { mkdir } from 'fs/promises'
import { join } from 'path'

import { readJsonIfExists, writeJson } from './helpers/json-file.js'
import { userspaceDirectory } from './helpers/paths.js'
import {
	scrapeMatch,
	scrapeTable,
	scrapeTeamGames,
} from './integrations/komplettligaen/scraper.js'

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

const getBundle = async (matchId, teamId = null) => {
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
}
