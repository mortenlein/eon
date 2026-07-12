// player-highlight.js - the spotlight CARD for "player highlight mode",
// triggered by eon-director. When the director sees a standout moment (a
// multi-kill or a clutch) it locks the camera on that player and sends a
// `draw:highlight` control event; the server relays it and
// websocket-on-message.js re-dispatches it as the DOM event
// `socket:draw:highlight`. This card then names the player, shows the reason
// tag (TRIPLE KILL / QUAD KILL / ACE / CLUTCH) and their live K/A/D/ADR.
//
//   body { show:true, steamid, roundKills, tag, durationMs }  -> show a spotlight
//   body { show:false }                                        -> hide
//
// The director only sends WHO (steamid) + WHY (tag/roundKills); the rich stats
// are looked up here from $players, the same source every component uses.

export default {
	data() {
		return { visible: false, steamid: null, tag: '', roundKills: 0 }
	},

	computed: {
		player() {
			if (! this.steamid) return null
			return (this.$players || []).find((p) => String(p.steam64Id) === this.steamid) || null
		},

		sideClass() {
			const side = this.player?.side
			return side === 3 ? '--ct' : side === 2 ? '--t' : ''
		},
	},

	mounted() {
		this._onDraw = (event) => {
			const body = event.detail || {}
			if (this._hideTimer) {
				clearTimeout(this._hideTimer)
				this._hideTimer = null
			}
			if (body.show === false) {
				this.visible = false
				return
			}
			this.steamid = body.steamid != null ? String(body.steamid) : null
			this.tag = body.tag || 'HIGHLIGHT'
			this.roundKills = body.roundKills || 0
			this.visible = true
			if (body.durationMs > 0) {
				this._hideTimer = setTimeout(() => { this.visible = false }, body.durationMs)
			}
		}
		window.addEventListener('socket:draw:highlight', this._onDraw)
	},

	beforeUnmount() {
		window.removeEventListener('socket:draw:highlight', this._onDraw)
		if (this._hideTimer) clearTimeout(this._hideTimer)
	},
}
