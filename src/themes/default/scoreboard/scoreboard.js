// scoreboard.js - a custom broadcast scoreboard overlay, TRIGGERED BY
// eon-director (not the built-in CS2 scoreboard). It is normally hidden; the
// director shows/hides it by sending a `draw:scoreboard` control event over
// eon's WebSocket, which the server relays to every overlay client and
// websocket-on-message.js re-dispatches as the DOM event `socket:draw:scoreboard`.
//
//   body { show: true }   -> show      body { show: false } -> hide
//   body {}               -> toggle    body { show, durationMs } -> auto-hide
//
// Data comes from the same reactive globals every component uses: $players
// (kills/assists/deaths/adr per player, side 2=T / 3=CT) and $teams (name +
// score). No GSI re-ingest, no new server code.

const sideNum = (side) => {
	if (typeof side === 'number') return side
	if (side === 'CT') return 3
	if (side === 'T') return 2
	return side
}

export default {
	data() {
		return { visible: false }
	},

	computed: {
		ctTeam() {
			return this.teamForSide(3)
		},

		tTeam() {
			return this.teamForSide(2)
		},

		ctPlayers() {
			return this.playersForSide(3)
		},

		tPlayers() {
			return this.playersForSide(2)
		},

		mapName() {
			return this.$map?.formattedName || this.$map?.name || ''
		},

		roundLabel() {
			const round = this.$map?.round
			return Number.isFinite(round) ? `Round ${round + 1}` : ''
		},
	},

	methods: {
		teamForSide(side) {
			const match = (this.$teams || []).find((team) => sideNum(team.side) === side)
			if (match) return match
			return { name: side === 3 ? 'Counter-Terrorists' : 'Terrorists', score: 0 }
		},

		playersForSide(side) {
			return (this.$players || [])
				.filter((player) => player.side === side)
				.sort((a, b) => (b.kills - a.kills) || (a.deaths - b.deaths))
		},
	},

	watch: {
		// while the scoreboard is up, tag <body> so the theme fades the busy
		// sidebars/focused-player out (the top-bar score stays). CSS does the rest.
		visible(isVisible) {
			document.body.classList.toggle('scoreboard-active', isVisible)
		},
	},

	mounted() {
		this._onDraw = (event) => {
			const body = event.detail || {}
			this.visible = typeof body.show === 'boolean' ? body.show : ! this.visible

			if (this._hideTimer) {
				clearTimeout(this._hideTimer)
				this._hideTimer = null
			}
			if (this.visible && body.durationMs > 0) {
				this._hideTimer = setTimeout(() => { this.visible = false }, body.durationMs)
			}
		}
		window.addEventListener('socket:draw:scoreboard', this._onDraw)
	},

	beforeUnmount() {
		window.removeEventListener('socket:draw:scoreboard', this._onDraw)
		document.body.classList.remove('scoreboard-active')
		if (this._hideTimer) clearTimeout(this._hideTimer)
	},
}
