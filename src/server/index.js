import http from 'http'
import { parse } from 'url'
import { join, basename, extname } from 'path'

import bodyParser from 'koa-bodyparser'
import Koa from 'koa'
import KoaRouter from '@koa/router'
import KoaCompress from 'koa-compress'

import { initSettings, getSettings, getThemeTree } from './settings.js'
import { registerConfigRoutes } from './config.js'
import { registerDependencyRoutes } from './dependencies.js'
import { registerGsiRoutes } from './gsi.js'
import { registerHudRoutes, concatStaticFileFromThemeTreeRecursively } from './hud.js'
import { registerLicensesRoutes } from './licenses.js'
import { registerRadarRoutes } from './radar.js'
import { registerVersionRoutes } from './version.js'
import { Websocket } from './websocket.js'
import send from 'koa-send'
import { builtinRootDirectory } from './helpers/paths.js'

Error.stackTraceLimit = 64

const run = async () => {
	await initSettings()
	const { settings } = await getSettings()

	const host = process.env.HOST || settings.host || '127.0.0.1'
	const port = process.env.PORT || settings.port || 31982

	const app = new Koa()
	const server = http.createServer(app.callback())

	app.use(KoaCompress())

	app.use(bodyParser({
		strict: true,
		enableTypes: ['json'],
	}))

	const websocket = new Websocket(server)
	await websocket.init()

	// 1. Mandatory Trailing Slash Redirects
	app.use(async (context, next) => {
		const path = context.path
		if ((path === '/config' || path === '/hud' || path === '/radar') && !path.endsWith('/')) {
			context.status = 301
			context.redirect(`${path}/`)
			return
		}
		await next()
	})

	// 2. Initialize principal router for API routes
	const router = new KoaRouter()
	registerConfigRoutes(router, websocket)
	registerDependencyRoutes(router)
	registerGsiRoutes(router, websocket)
	registerHudRoutes(router)
	registerLicensesRoutes(router)
	registerRadarRoutes(router)
	registerVersionRoutes(router)

	app.use(router.routes())
	app.use(router.allowedMethods())

	// 3. Centralized fallback for static assets
	app.use(async (context) => {
		if (context.status !== 404 || context.body) return

		const urlPath = context.path
		
		try {
			if (urlPath.startsWith('/config/')) {
				const file = urlPath.slice(8).trim() || 'index.html'
				const root = join(builtinRootDirectory, 'src/config')
				await send(context, file, { root })
				if (context.body) {
					context.status = 200
					if (file.endsWith('.js')) context.type = 'application/javascript'
					if (file.endsWith('.css')) context.type = 'text/css'
				}
			} 
			else if (urlPath.startsWith('/radar/')) {
				const file = urlPath.slice(7).trim() || 'index.html'
				const root = join(builtinRootDirectory, 'src/radar')
				await send(context, file, { root })
				if (context.body) context.status = 200
			} 
			else if (urlPath.startsWith('/hud/')) {
				const themeTree = await getThemeTree(context.query.theme)
				const hudPath = decodeURIComponent(urlPath.slice(5) || 'index.html').replace(/^\//, '')
				if (basename(hudPath).startsWith('.')) return

				const body = await concatStaticFileFromThemeTreeRecursively(hudPath, [], themeTree)
				if (body) {
					context.type = extname(hudPath)
					context.body = Buffer.isBuffer(body[0]) ? Buffer.concat(body) : body.join('\n')
					context.status = 200
				}
			}
		} catch (err) {
			// Silent 404
		}
	})

	server.listen(port, host)
	console.info(`cs-hud active at http://${host}:${port}. Press Ctrl+C to quit.`)
}

run().then(() => {}).catch(console.error)
