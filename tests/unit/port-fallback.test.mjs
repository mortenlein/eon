import { test } from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const runtimeFile = join(root, 'tmp', 'eon-runtime.json')
const { candidates } = JSON.parse(readFileSync(join(root, 'ports.json'), 'utf8'))

const hold = (port) => new Promise((resolve) => {
	const s = net.createServer()
	s.once('error', () => resolve(null))
	s.listen(port, '127.0.0.1', () => resolve(s))
})

const startEon = (port) => {
	const child = spawn(process.execPath, ['.'], {
		cwd: root,
		env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	child.output = ''
	child.stdout.on('data', (d) => { child.output += d })
	child.stderr.on('data', (d) => { child.output += d })
	return child
}

const waitFor = (child, pattern, ms = 20000) => new Promise((resolve, reject) => {
	const timer = setTimeout(() => { clearInterval(tick); reject(new Error(`no ${pattern} within ${ms} ms:\n${child.output}`)) }, ms)
	const tick = setInterval(() => {
		const m = pattern.exec(child.output)
		if (m) { clearTimeout(timer); clearInterval(tick); resolve(m) }
	}, 50)
})

const exited = (child) => new Promise((resolve) => {
	if (child.exitCode !== null) resolve(child.exitCode)
	else child.once('exit', (c) => resolve(c))
})

// 2026-10-29: 31982 could not be bound at the broadcast and eon refused to start.
// A taken first candidate must move eon to the next one, not stop the stream.
test('eon moves to the next candidate when the preferred port is taken, and says where it went', async (t) => {
	const holders = [await hold(candidates[0])]
	if (!holders[0]) return t.skip(`${candidates[0]} is already in use on this machine`)
	const free = await hold(candidates[1])
	if (!free) { holders[0].close(); return t.skip(`${candidates[1]} is already in use on this machine`) }
	free.close()
	const child = startEon(candidates[0])
	try {
		await waitFor(child, new RegExp(`\\[eon\\] listening on 127\\.0\\.0\\.1:${candidates[1]}`))
		assert.match(child.output, new RegExp(`\\[eon\\] port ${candidates[0]} unavailable \\(EADDRINUSE\\), trying ${candidates[1]}`))
		const runtime = JSON.parse(readFileSync(runtimeFile, 'utf8'))
		assert.deepEqual({ host: runtime.host, port: runtime.port, pid: runtime.pid }, { host: '127.0.0.1', port: candidates[1], pid: child.pid })
		const status = await fetch(`http://127.0.0.1:${candidates[1]}/api/status`)
		assert.equal(status.ok, true)
		child.kill('SIGTERM')
		await exited(child)
		assert.equal(existsSync(runtimeFile), false, 'a clean exit removes the runtime file')
	} finally {
		child.kill('SIGKILL')
		holders.forEach((h) => h.close())
	}
})

test('eon exits non-zero naming every candidate when all of them are taken', async (t) => {
	const holders = await Promise.all(candidates.map(hold))
	try {
		if (holders.some((h) => !h)) return t.skip('a candidate port is already in use on this machine')
		const child = startEon(candidates[0])
		try {
			const code = await Promise.race([exited(child), new Promise((_, reject) => setTimeout(() => reject(new Error(`eon kept running:\n${child.output}`)), 20000))])
			assert.equal(code, 1)
			assert.match(child.output, new RegExp(`\\[eon\\] cannot listen on 127\\.0\\.0\\.1:${candidates.join(',')} \\(EADDRINUSE,EADDRINUSE,EADDRINUSE\\) - exiting`))
		} finally {
			child.kill('SIGKILL')
		}
	} finally {
		holders.forEach((h) => h && h.close())
	}
})

// CS2 posts to every installed cfg, so a moved eon keeps getting GSI without a
// CS2 restart, but only if there is exactly one cfg per candidate, identical
// apart from the port.
test('there is one GSI cfg per candidate port, identical apart from name and port', () => {
	const cfgs = readdirSync(root).filter((f) => /^gamestate_integration_eon.*\.cfg$/.test(f))
	const template = readFileSync(join(root, 'gamestate_integration_eon.cfg'), 'utf8')
	assert.match(template, new RegExp(`127\\.0\\.0\\.1:${candidates[0]}/gsi`))
	const byPort = new Map(cfgs.map((f) => [Number(/127\.0\.0\.1:(\d+)\/gsi/.exec(readFileSync(join(root, f), 'utf8'))[1]), f]))
	assert.deepEqual([...byPort.keys()].sort(), [...candidates].sort())
	for (const [port, file] of byPort) {
		const normalized = readFileSync(join(root, file), 'utf8')
			.replace(`127.0.0.1:${port}/gsi`, `127.0.0.1:${candidates[0]}/gsi`)
			.replace(/^"eon GSI[^"]*"/, '"eon GSI"')
		assert.equal(normalized, template, `${file} drifted from the template`)
	}
})
