import Digits from '/hud/digits/digits.vue'
import { additionalState } from '/hud/core/state.js'

export default {
	components: {
		Digits,
	},

	data() {
		return {
			nowUnixTimestamp: Date.now(),
			timerInterval: null,
		}
	},

	mounted() {
		this.timerInterval = setInterval(() => {
			this.nowUnixTimestamp = Date.now()
		}, 250)
	},

	beforeUnmount() {
		if (this.timerInterval) clearInterval(this.timerInterval)
	},

	computed: {
		bombCountdown() {
			const countdown = this.$bomb?.countdownSec
			if (! Number.isFinite(countdown)) return 0
			return Math.max(0, Math.ceil(countdown))
		},

		roundEndsInSec() {
			const syncedAt = additionalState.unixTimestamp
			const phaseEndsInSec = Number(this.$round?.phaseEndsInSec)
			if (! Number.isFinite(phaseEndsInSec)) return 0
			if (additionalState.uiDevMode) return Math.max(0, Math.ceil(phaseEndsInSec))
			if (! syncedAt) return Math.max(0, Math.ceil(phaseEndsInSec))

			const elapsedSeconds = (this.nowUnixTimestamp - syncedAt) / 1000
			return Math.max(0, Math.ceil(phaseEndsInSec - elapsedSeconds))
		},

		clockMinutes() {
			return Math.floor(this.roundEndsInSec / 60)
		},

		clockSeconds() {
			return Math.floor(this.roundEndsInSec % 60)
		},

		isClockRed() {
			if (this.$round?.phase === 'freezetime' && ! this.$opts['preferences.topBar.clock.tenSecondsRedInFreezetime']) return false
			if ((this.$round?.phase === 'timeout_ct' || this.$round?.phase === 'timeout_t') && ! this.$opts['preferences.topBar.clock.tenSecondsRedInTacticalTimeout']) return false
			if (this.$round?.phase === 'over' && ! this.$opts['preferences.topBar.clock.tenSecondsRedInRoundRestartDelay']) return false

			return this.clockMinutes === 0
				&& this.clockSeconds <= 10
		},
	},
}


