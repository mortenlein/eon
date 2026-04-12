import { additionalState, bomb, grenades, gsiState, map, misc, players, round, rounds, teams } from '/hud/core/state.js'
import { onMessage } from '/hud/core/websocket-on-message.js'

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}`;
export let ws

export const connectToWebsocket = () => {
	if (ws) ws.close()

	ws = new WebSocket(wsUrl)

	ws.onopen = () => console.info('Websocket connection established')

	ws.onmessage = onMessage

	ws.onerror = (err) => {
		console.error('Websocket connection error; closing connection', err.message)
		ws.close()
	}

	ws.onclose = () => {
		console.warn('Websocket connection closed, reconnecting...')
		setTimeout(() => connectToWebsocket(), 500)
	}
}
