import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { dirname, join } from 'path'

import { builtinRootDirectory, customRootDirectory } from './helpers/paths.js'

// The ports eon may run on, in order of preference. One list, read by eon, the
// CS2 GSI cfgs (one per port, so CS2 never needs a restart when eon moves) and
// eon-director (OBS repoint, firewall rule, Windows port reservation).
export const portCandidates = () => JSON.parse(readFileSync(join(builtinRootDirectory, 'ports.json'), 'utf8')).candidates

// Where eon says which port it actually got. Written on listen, removed on a
// clean exit; a hard kill leaves it behind, so readers check pid or /api/status.
export const runtimeFilePath = join(customRootDirectory, 'tmp', 'eon-runtime.json')

const tryListen = (server, port, host) => new Promise((resolve) => {
	const onError = (error) => {
		server.off('listening', onListening)
		resolve(error.code || error.message)
	}
	const onListening = () => {
		server.off('error', onError)
		resolve(null)
	}
	server.prependOnceListener('error', onError)
	server.once('listening', onListening)
	server.listen(port, host)
})

/**
 * Bind `preferred`, or the next free candidate when `preferred` is one of them.
 * A port outside the candidate list is tried alone (strict, as before).
 * @returns {Promise<{port: number|null, tried: number[], codes: string[]}>}
 */
export async function listenWithFallback(server, host, preferred) {
	const candidates = portCandidates()
	const ports = candidates.includes(preferred) ? [preferred, ...candidates.filter((p) => p !== preferred)] : [preferred]
	const codes = []
	for (const [i, port] of ports.entries()) {
		const code = await tryListen(server, port, host)
		if (!code) return { port, tried: ports.slice(0, i + 1), codes }
		codes.push(code)
		if (i + 1 < ports.length) console.warn(`[eon] port ${port} unavailable (${code}), trying ${ports[i + 1]}`)
	}
	return { port: null, tried: ports, codes }
}

export function writeRuntimeFile(host, port) {
	mkdirSync(dirname(runtimeFilePath), { recursive: true })
	writeFileSync(runtimeFilePath, JSON.stringify({ host, port, pid: process.pid, startedAt: new Date().toISOString() }, null, '\t'))
}

// only our own file: a second eon that failed to bind must not delete the live one's
export function removeRuntimeFile() {
	try {
		if (JSON.parse(readFileSync(runtimeFilePath, 'utf8')).pid === process.pid) rmSync(runtimeFilePath)
	} catch {
		// already gone
	}
}
