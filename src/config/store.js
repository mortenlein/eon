import { reactive, watch } from '/dependencies/vue.js'

export const state = reactive({
	// Configuration Data
	options: {},
	sections: [],
	theme: 'default',
	
	// UI State
	activeCategory: localStorage.getItem('eon-config-category') || 'dashboard',
	showAdvancedSettings: localStorage.getItem('eon-config-advanced') === 'true',
	saveState: 'idle', // idle, saving, saved, error
	alerts: [], // Caster Alerts
	
	// Sync State
	socket: null,
	isSynced: false,
})

// Persistence for UI preferences
watch(() => state.activeCategory, (val) => localStorage.setItem('eon-config-category', val))
watch(() => state.showAdvancedSettings, (val) => localStorage.setItem('eon-config-advanced', val))

export const actions = {
	async init() {
		await this.loadOptions()
		this.initWebsocket()
	},

	async loadOptions() {
		try {
			const res = await fetch('/config/options')
			const json = await res.json()
			
			const options = {}
			for (const opt of json) {
				options[opt.key] = opt.value ?? opt.fallback ?? null
				if (opt.key === 'theme') state.theme = opt.value || opt.fallback
			}
			state.options = options
			state.isSynced = true
		} catch (err) {
			console.error('Failed to load options', err)
		}
	},

	initWebsocket() {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
		state.socket = new WebSocket(`${protocol}//${window.location.host}`)

		state.socket.onmessage = (msg) => {
			try {
				const { event, body } = JSON.parse(msg.data)
				if (event === 'config:update' && body.key) {
					state.options[body.key] = body.value
				} else if ((event === 'static_data' || event === 'state') && body.options) {
					Object.assign(state.options, body.options)
				} else if (event === 'CASTER_ALERT') {
					this.addAlert(body.message, body.type)
				}
			} catch (e) {}
		}

		state.socket.onclose = () => setTimeout(() => this.initWebsocket(), 1000)
	},

	addAlert(message, type = 'info') {
		const id = Date.now()
		state.alerts.push({ id, message, type })
		setTimeout(() => {
			const idx = state.alerts.findIndex(a => a.id === id)
			if (idx !== -1) state.alerts.splice(idx, 1)
		}, 5000)
	},

	async save(partial = null) {
		state.saveState = 'saving'
		const payload = partial || { ...state.options, theme: state.theme }

		try {
			await fetch('/config/options', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
			state.saveState = 'saved'
			setTimeout(() => { if (state.saveState === 'saved') state.saveState = 'idle' }, 2000)
		} catch (err) {
			state.saveState = 'error'
			console.error(err)
		}
	},

	async forceRefresh() {
		try {
			await fetch('/config/force-hud-refresh', { method: 'POST' })
			this.addAlert('HUD Refresh Triggered', 'success')
		} catch (err) {
			this.addAlert('Refresh failed', 'error')
		}
	},

	broadcast(key, value) {
		if (state.socket && state.socket.readyState === WebSocket.OPEN) {
			if (key.includes(':')) {
				state.socket.send(JSON.stringify({ event: key, body: value }))
				return
			}

			state.socket.send(JSON.stringify({ event: 'config:update', body: { key, value } }))
		}
	}
}
