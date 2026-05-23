import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// CLI options
const args = process.argv.slice(2);

function getArgValue(name, fallback) {
	const idx = args.indexOf(name);
	if (idx !== -1 && idx + 1 < args.length) {
		return args[idx + 1];
	}
	return fallback;
}

const fixtureArg = getArgValue('--fixture', 'tests/fixtures/gsi/live.json');
const intervalArg = getArgValue('--interval', null);
const tokenArg = getArgValue('--token', '7ATvXUzTfBYyMLrA');
const portArg = getArgValue('--port', '31982');
const hostArg = getArgValue('--host', 'localhost');

const endpoint = `http://${hostArg}:${portArg}/api/gsi`;

async function loadAndPostFixture(fixturePath) {
	const absolutePath = path.isAbsolute(fixturePath) 
		? fixturePath 
		: path.resolve(projectRoot, fixturePath);
		
	try {
		const raw = await fs.readFile(absolutePath, 'utf8');
		const payload = JSON.parse(raw);

		// Guarantee auth token is set
		if (!payload.auth) payload.auth = {};
		payload.auth.token = tokenArg;

		console.log(`[Simulator] POSTing fixture "${fixturePath}" to ${endpoint}...`);
		
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'CS2 GSI Simulator/v1.0'
			},
			body: JSON.stringify(payload)
		});

		if (response.ok) {
			console.log(`[Simulator] Success! Status: ${response.status} (No Content)`);
		} else {
			console.error(`[Simulator] Failed. Status: ${response.status} ${response.statusText}`);
			const text = await response.text();
			console.error(`            Response: ${text}`);
		}
	} catch (err) {
		console.error(`[Simulator] Error processing fixture "${fixturePath}": ${err.message}`);
	}
}

async function run() {
	console.log('=========================================');
	console.log('  Eon CS2 GSI Simulator');
	console.log('=========================================');
	console.log(`- Fixture: ${fixtureArg}`);
	console.log(`- Token:   ${tokenArg}`);
	console.log(`- Endpoint: ${endpoint}`);
	
	if (intervalArg) {
		const ms = parseInt(intervalArg, 10);
		console.log(`- Mode:     Continuous Loop (every ${ms}ms)`);
		console.log('Press Ctrl+C to stop simulation.');
		console.log('-----------------------------------------');
		
		// If continuous, we can play back a standard sequence of our 4 fixtures!
		const sequence = [
			'tests/fixtures/gsi/freezetime.json',
			'tests/fixtures/gsi/live.json',
			'tests/fixtures/gsi/bomb-planted.json',
			'tests/fixtures/gsi/round-over.json'
		];
		
		// Check if the user specified a custom fixture path or if we should use the default sequence
		const useSequence = fixtureArg === 'tests/fixtures/gsi/live.json';
		let step = 0;

		const intervalId = setInterval(async () => {
			if (useSequence) {
				const fixture = sequence[step % sequence.length];
				await loadAndPostFixture(fixture);
				step++;
			} else {
				await loadAndPostFixture(fixtureArg);
			}
		}, ms);

		process.on('SIGINT', () => {
			clearInterval(intervalId);
			console.log('\n[Simulator] Simulation stopped.');
			process.exit(0);
		});
	} else {
		console.log('- Mode:     Single Post');
		console.log('-----------------------------------------');
		await loadAndPostFixture(fixtureArg);
	}
}

run().catch(err => {
	console.error('[Simulator] Fatal error:', err);
	process.exit(1);
});
