import AlivePlayer from '/hud/radar/player/alive-player/alive-player.vue'
import DeadPlayer from '/hud/radar/player/dead-player/dead-player.vue'

export default {
	props: [
		'player',
	],

	components: {
		AlivePlayer,
		DeadPlayer,
	},

	computed: {
		hasRadarPosition() {
			return Array.isArray(this.player?.position) && this.player.position.length >= 3
		},

		hasRadarForward() {
			return Array.isArray(this.player?.forward) && this.player.forward.length >= 2
		},
	},
}
