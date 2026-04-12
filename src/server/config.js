import send from 'koa-send'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { getSettings } from './settings.js'
import { readJson, writeJson } from './helpers/json-file.js'
import { builtinRootDirectory, userspaceDirectory, userspaceSettingsPath } from './helpers/paths.js'
import { MODE_PRESETS } from './helpers/game-modes.js'

export const registerConfigRoutes = (router, websocket) => {
	router.get('/', (context) => {
		context.status = 302
		context.redirect('/hud')
	})

	router.get('/config/options', async (context) => {
		const { settings } = await getSettings().catch((err) => {
			console.error('Error getting settings', err)
			return { settings: { options: {} } }
		})

		context.body = [
			{
				fallback: 'fennec',
				key: 'theme',
				section: 'Theme',
				type: 'string',
				value: settings.parent,
			},

			...Object.entries(settings.options).map(([key, data]) => ({
				...data,
				key,
				sectionDescription: settings.optionSectionDescriptions?.[data.section],
			})),
		]
	})



	router.get('/analysis', async (context) => {
		await send(context, 'analysis.html', { root: `${builtinRootDirectory}/src/config` })
	})

	router.put('/config/options', async (context) => {
		const settings = await readJson(userspaceSettingsPath)

		if (! settings.options) settings.options = {}

		let wasThemeChanged = false
		const incoming = context.request.body

		// 1. Detect Game Mode change for automatic presets
		const currentMode = settings.options['match.mode']?.value
		const newMode = incoming['match.mode']

		if (newMode && newMode !== currentMode) {
			const presets = MODE_PRESETS[newMode]
			if (presets) {
				for (const [key, val] of Object.entries(presets)) {
					if (! settings.options[key]) settings.options[key] = {}
					settings.options[key].value = val
				}
			}
		}

		for (const [key, value] of Object.entries(incoming)) {
			if (key === 'theme') {
				wasThemeChanged = settings.parent !== (value || 'fennec')
				settings.parent = (value || 'fennec')
			} else if (value != null) { // this SHOULD be a double-equal instead of triple-equal (similar to lodash's isNil)
				if (! settings.options[key]) settings.options[key] = {}
				settings.options[key].value = value
			} else if (settings.options[key]) {
				delete settings.options[key].value
			}
		}

		await writeJson(userspaceSettingsPath, settings)
		await websocket.updateCaches()

		if (wasThemeChanged) websocket.broadcastRefresh()

		context.status = 204
	})

	router.post('/config/upload-image', async (context) => {
		const { filename, base64 } = context.request.body
		if (!filename || !base64) {
			context.status = 400
			return
		}
		try {
			const ext = String(filename).split('.').pop().toLowerCase()
			if (!['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext)) {
				context.status = 400
				context.body = { error: 'Unsupported file type' }
				return
			}
			const newName = `upload-${Date.now()}.${ext}`
			const filepath = join(userspaceDirectory, newName)
			
			const base64Data = base64.split(',')[1] || base64
			const buffer = Buffer.from(base64Data, 'base64')
			await writeFile(filepath, buffer)

			context.body = { url: `/hud/${newName}` }
		} catch (err) {
			console.error('Upload Error:', err)
			context.status = 500
			context.body = { error: 'Failed to save image' }
		}
	})

	router.post('/config/force-hud-refresh', async (context) => {
		websocket.broadcastRefresh()
		context.status = 204
	})

	/* ── Layout presets ── */
	const presetsPath = `${userspaceDirectory}/layout-presets.json`

	const loadPresets = async () => {
		try { return await readJson(presetsPath) }
		catch { return [] }
	}

	router.get('/config/layout-presets', async (context) => {
		context.body = await loadPresets()
	})

	router.post('/config/layout-presets', async (context) => {
		const presets = await loadPresets()
		const preset = {
			id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
			name: context.request.body.name || 'Untitled',
			values: context.request.body.values || {},
			createdAt: new Date().toISOString(),
		}
		presets.push(preset)
		await writeJson(presetsPath, presets)
		context.body = preset
		context.status = 201
	})

	router.put('/config/layout-presets/:id', async (context) => {
		const presets = await loadPresets()
		const idx = presets.findIndex(p => p.id === context.params.id)
		if (idx === -1) { context.status = 404; return }
		if (context.request.body.name) presets[idx].name = context.request.body.name
		if (context.request.body.values) presets[idx].values = context.request.body.values
		presets[idx].updatedAt = new Date().toISOString()
		await writeJson(presetsPath, presets)
		context.body = presets[idx]
	})

	router.delete('/config/layout-presets/:id', async (context) => {
		let presets = await loadPresets()
		presets = presets.filter(p => p.id !== context.params.id)
		await writeJson(presetsPath, presets)
		context.status = 204
	})


}
