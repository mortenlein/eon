import send from 'koa-send'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getSettings, normalizeSettingsOptions } from './settings.js'
import { readJson, writeJson } from './helpers/json-file.js'
import { builtinRootDirectory, userspaceDirectory, userspaceSettingsPath } from './helpers/paths.js'
import { MODE_PRESETS } from './helpers/game-modes.js'
import { LEGACY_TO_CANONICAL, CANONICAL_TO_LEGACY } from './helpers/canonical-map.js'

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
				fallback: 'default',
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
		normalizeSettingsOptions(settings)

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
					const canonicalKey = LEGACY_TO_CANONICAL[key] || key
					if (! settings.options[canonicalKey]) settings.options[canonicalKey] = {}
					settings.options[canonicalKey].value = val

					// Remove legacy aliases to prevent duplication
					const aliases = CANONICAL_TO_LEGACY[canonicalKey] || []
					for (const alias of aliases) {
						delete settings.options[alias]
					}
				}
			}
		}

		for (const [key, value] of Object.entries(incoming)) {
			if (key === 'theme') {
				wasThemeChanged = settings.parent !== (value || 'default')
				settings.parent = (value || 'default')
			} else {
				const canonicalKey = LEGACY_TO_CANONICAL[key] || key
				if (value != null) { // this SHOULD be a double-equal instead of triple-equal (similar to lodash's isNil)
					if (! settings.options[canonicalKey]) settings.options[canonicalKey] = {}
					settings.options[canonicalKey].value = value
				} else if (settings.options[canonicalKey]) {
					delete settings.options[canonicalKey].value
				}

				// Remove legacy aliases to prevent duplication in userspace theme.json
				const aliases = CANONICAL_TO_LEGACY[canonicalKey] || []
				for (const alias of aliases) {
					delete settings.options[alias]
				}
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

	router.post('/config/upload-font', async (context) => {
		const { filename, base64 } = context.request.body
		if (!filename || !base64) {
			context.status = 400
			return
		}

		try {
			const ext = String(filename).split('.').pop().toLowerCase()
			if (!['woff2', 'woff', 'ttf', 'otf'].includes(ext)) {
				context.status = 400
				context.body = { error: 'Unsupported font type' }
				return
			}

			const fontFamily = String(filename)
				.replace(/\.[^.]+$/, '')
				.replace(/[^a-z0-9_-]+/gi, '-')
				.replace(/^-+|-+$/g, '')
				.slice(0, 48) || 'uploaded-font'
			const newName = `font-${Date.now()}-${fontFamily}.${ext}`
			const fontsDirectory = join(userspaceDirectory, 'fonts')
			const filepath = join(fontsDirectory, newName)

			const base64Data = base64.split(',')[1] || base64
			const buffer = Buffer.from(base64Data, 'base64')
			await mkdir(fontsDirectory, { recursive: true })
			await writeFile(filepath, buffer)

			context.body = {
				fontFamily,
				url: `/hud/fonts/${newName}`,
			}
		} catch (err) {
			console.error('Font Upload Error:', err)
			context.status = 500
			context.body = { error: 'Failed to save font' }
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



	/* ── Setup Import/Export ── */
	router.get('/config/export', async (context) => {
		const theme = await readJson(userspaceSettingsPath).catch(() => ({}))
		const presets = await loadPresets()
		
		context.body = {
			theme,
			presets,
			exportedAt: new Date().toISOString()
		}
		context.set('Content-Disposition', `attachment; filename="eon-setup-${Date.now()}.json"`)
	})

	router.post('/config/import', async (context) => {
		const { theme, presets } = context.request.body
		if (!theme && !presets) {
			context.status = 400
			context.body = { error: 'Invalid setup file' }
			return
		}

		if (theme) {
			// 1. Create backup of existing theme.json if it exists
			const currentTheme = await readJson(userspaceSettingsPath).catch(() => null)
			if (currentTheme) {
				const backupPath = `${userspaceDirectory}/theme.backup.pre-canonical.json`
				await writeJson(backupPath, currentTheme)
			}

			// 2. Normalize imported options to canonical
			normalizeSettingsOptions(theme)

			await writeJson(userspaceSettingsPath, theme)
		}

		if (presets) await writeJson(presetsPath, presets)

		websocket.broadcastRefresh()
		context.status = 204
	})
}
