import http from 'http'
import os from 'os'
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
import { registerDiagnosticsRoutes } from './diagnostics.js'
import { registerHudRoutes, concatStaticFileFromThemeTreeRecursively } from './hud.js'
import { registerKomplettligaenRoutes } from './komplettligaen.js'
import { registerLicensesRoutes } from './licenses.js'
import { registerRadarRoutes } from './radar.js'
import { registerVersionRoutes } from './version.js'
import { registerSessionRoutes } from './sessions/session-routes.js'
import { Websocket } from './websocket.js'
import send from 'koa-send'
import { builtinRootDirectory } from './helpers/paths.js'
import { isUiDevMode } from './dev-mode.js'

Error.stackTraceLimit = 64

const run = async () => {
	await initSettings()
	const { settings } = await getSettings()

	const host = process.env.HOST || settings.host || '0.0.0.0'
	const port = process.env.PORT || settings.port || 31982

	const app = new Koa()
	const server = http.createServer(app.callback())

	app.use(KoaCompress())

	app.use(bodyParser({
		strict: true,
		enableTypes: ['json'],
		jsonLimit: '12mb',
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
	registerDiagnosticsRoutes(router, websocket)
	registerDependencyRoutes(router)
	registerGsiRoutes(router, websocket)
	registerHudRoutes(router)
	registerKomplettligaenRoutes(router, websocket)
	registerLicensesRoutes(router)
	registerRadarRoutes(router)
	registerVersionRoutes(router)
	registerSessionRoutes(router)

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
					if (file.endsWith('.vue')) context.type = 'text/plain'
					else if (file.endsWith('.js')) context.type = 'application/javascript'
					else if (file.endsWith('.css')) context.type = 'text/css'
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
			else {
				// Fallback to serving from the public directory
				const root = join(builtinRootDirectory, 'public')
				await send(context, urlPath.replace(/^\//, ''), { root })
				if (context.body) context.status = 200
			}
		} catch (err) {
			// Silent 404
		}
	})

	server.listen(port, host)
	
	const interfaces = os.networkInterfaces()
	const addresses = []
	for (const k in interfaces) {
		for (const k2 in interfaces[k]) {
			const address = interfaces[k][k2]
			if (address.family === 'IPv4' && !address.internal) {
				addresses.push(address.address)
			}
		}
	}

	console.info(`\n[Server] cs-hud active at:`)
	console.info(` > Local:    http://localhost:${port}`)
	addresses.forEach(addr => console.info(` > Network:  http://${addr}:${port}`))
	if (host === '0.0.0.0') {
		console.info(`\n[Server] Bound to all interfaces (0.0.0.0)`)
	} else {
		console.info(`\n[Server] Bound to host: ${host}`)
	}
	if (isUiDevMode) {
		console.info('UI dev mode enabled: serving static match state and ignoring live GSI posts.')
	}

	// 4. Graceful Shutdown & Unhandled Exception Logging
	process.on('uncaughtException', (error) => {
		console.error('[FATAL] Uncaught Exception:', error);
		shutdown(1);
	});

	process.on('unhandledRejection', (reason, promise) => {
		console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
	});

	const shutdown = (code = 0) => {
		console.info('Shutting down Eon server cleanly...');
		
		try {
			websocket.websocket.close(() => {
				console.info('Websocket server closed.');
				server.close(() => {
					console.info('HTTP server closed.');
					process.exit(code);
				});
			});
		} catch (err) {
			console.error('Error during graceful shutdown:', err);
			process.exit(code);
		}

		// Force exit after timeout if closing hangs
		setTimeout(() => {
			console.warn('Shutdown timed out, forcing exit.');
			process.exit(code);
		}, 3000);
	};

	process.on('SIGINT', () => shutdown(0));
	process.on('SIGTERM', () => shutdown(0));
}

run().then(() => {}).catch(console.error)
