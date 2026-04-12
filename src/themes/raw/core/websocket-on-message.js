import { options } from '/hud/core/state.js'
import { handleRefresh } from '/hud/core/websocket-events/refresh.js'
import { handleState } from '/hud/core/websocket-events/state.js'

let lastWsTime = 0;
let wsQueue = [];
let wsRaf = null;

const processWsQueue = (timestamp) => {
	if (timestamp - lastWsTime < 16) {
		wsRaf = requestAnimationFrame(processWsQueue);
		return;
	}
	lastWsTime = timestamp;
	wsRaf = null;

	if (wsQueue.length === 0) return;

	const messages = [...wsQueue];
	wsQueue = [];

	messages.forEach(msg => {
		try {
			const { event, body } = JSON.parse(msg.data);

			// Dispatch a global event for components to listen to
			window.dispatchEvent(new CustomEvent(`socket:${event}`, { detail: body }));

			switch (event) {
				case 'refresh': return handleRefresh(body);
				case 'state': return handleState(body);
				case 'gsi_update': return handleState(body);
				case 'static_data': return handleState(body);
				case 'config:update': 
					if (body.key) {
						if (body.value !== undefined && body.value !== null && body.value !== '') {
							options[body.key] = body.value;
						} else {
							delete options[body.key];
						}
					}
					break;
			}
		} catch (err) {}
	});
};

export const onMessage = (msg) => {
	wsQueue.push(msg);
	if (!wsRaf) {
		wsRaf = requestAnimationFrame(processWsQueue);
	}
};
