import { test } from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))

// 2026-09-24: a leftover held eon's port, eon logged the bind failure as
// NON-FATAL and kept running while listening to nothing. A bind failure must exit.
test('eon exits non-zero with a clear line when its port is taken', async () => {
	const holder = net.createServer()
	await new Promise((resolve) => holder.listen(0, '127.0.0.1', resolve))
	const port = holder.address().port
	const child = spawn(process.execPath, ['.'], {
		cwd: root,
		env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	let output = ''
	child.stdout.on('data', (d) => { output += d })
	child.stderr.on('data', (d) => { output += d })
	try {
		const code = await new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error(`eon kept running on a taken port:\n${output}`)), 20000)
			child.once('exit', (c) => { clearTimeout(timer); resolve(c) })
		})
		assert.equal(code, 1)
		assert.match(output, new RegExp(`\\[eon\\] cannot listen on 127\\.0\\.0\\.1:${port} \\(EADDRINUSE\\) - exiting`))
	} finally {
		child.kill('SIGKILL')
		holder.close()
	}
})
