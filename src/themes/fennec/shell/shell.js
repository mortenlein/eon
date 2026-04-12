import Corners from '/hud/corners/corners.vue'
import FocusedPlayer from '/hud/focused-player/focused-player.vue'
import MvpCard from '/hud/mvp-card/mvp-card.vue'
import PlayersAlive from '/hud/players-alive/players-alive.vue'
import Radar from '/hud/radar/radar.vue'
import SeriesGraph from '/hud/series-graph/series-graph.vue'
import Sidebars from '/hud/sidebars/sidebars.vue'
import Sponsors from '/hud/sponsors/sponsors.vue'
import SvgFilters from '/hud/svg-filters/svg-filters.vue'
import Telestrator from '/hud/telestrator/telestrator.vue'
import PromotionPanel from '/hud/promotion-panel/promotion-panel.vue'
import TopBar from '/hud/top-bar/top-bar.vue'
import WinProbGraph from '/hud/win-prob-graph/win-prob-graph.vue'

export default {
	components: {
		Corners,
		FocusedPlayer,
		MvpCard,
		PlayersAlive,
		Radar,
		SeriesGraph,
		Sidebars,
		Sponsors,
		SvgFilters,
		Telestrator,
		PromotionPanel,
		TopBar,
		WinProbGraph,
	},

	computed: {
		hasObserverData() {
			return this.$players?.length > 0
		},

		showObserverDataWarning() {
			return !!(
				this.$map?.name
				&& this.$gsiState?.player
				&& ! this.hasObserverData
			)
		},
	},

	mounted() {
		this.applyCssVariableOverrides()
		this.setScaleFactor()
		this.setMapImageUrl()

		window.addEventListener('resize', this.setScaleFactor)
	},

	watch: {
		'$opts': {
			handler() {
				this.applyCssVariableOverrides()
			},
			deep: true,
			immediate: true,
		},
		'$map.sanitizedName': {
			handler() {
				this.setMapImageUrl()
			},
			immediate: true,
		}
	},

	beforeUnmount() {
		window.removeEventListener('resize', this.setScaleFactor)
	},

	methods: {
		applyCssVariableOverrides() {
			if (!this.$opts) return

			Object.entries(this.$opts).forEach(([key, value]) => {
				if (!key.startsWith('css.')) return
				const prop = `--${key.substring(4)}`

				// Visibility Management via Helper Class (Preserves Design Integrity)
				if (key.endsWith('-display')) {
					const id = key.substring(4).replace('-display', '').replace('lan66-', '');
					let selector = `.${id}`;
					if (id === 'sidebar-left') selector = '.sidebar.--left';
					else if (id === 'sidebar-right') selector = '.sidebar.--right';
					else if (id === 'sponsor-left') selector = '.sponsor-slot.--left';
					else if (id === 'sponsor-right') selector = '.sponsor-slot.--right';

					const el = document.querySelector(selector);
					if (el) {
						if (value === 'none') el.classList.add('--layout-hidden');
						else el.classList.remove('--layout-hidden');
					}
					return;
				}

				if (value === '') {
					document.documentElement.style.removeProperty(prop)
				} else {
					document.documentElement.style.setProperty(
						prop,
						key.endsWith('-rgb') ? this.getRgbValueFromHex(value) : value,
					)
				}
			})
			this.setScaleFactor()
		},

		getRgbValueFromHex(hex) {
			if (! hex.startsWith('#')) return hex

			hex = hex.substring(1)
			if (hex.length === 3) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`

			const r = parseInt(hex.substring(0, 2), 16)
			const g = parseInt(hex.substring(2, 4), 16)
			const b = parseInt(hex.substring(4, 6), 16)

			return `${r}, ${g}, ${b}`
		},

		setScaleFactor() {
			const calculatedScaleFactor = this.calculateScaleFactor()
			document.documentElement.style.setProperty('--scale-factor', calculatedScaleFactor)
		},

		calculateScaleFactor() {
			const raw = getComputedStyle(document.documentElement).getPropertyValue('--base-scale-factor')
			const baseValue = parseFloat(raw)
			const baseUnit = raw.match(/\D+$/)[0]

			switch (baseUnit) {
				case 'vh': return `${Math.round(window.innerHeight / 100 * baseValue)}px`
				case 'vw': return `${Math.round(window.innerWidth / 100 * baseValue)}px`
				default: return raw
			}
		},

		setMapImageUrl() {
			if (!this.$map?.sanitizedName) return
			document.documentElement.style.setProperty(
				'--map-image-url',
				`url("/hud/img/maps/${this.$map.sanitizedName}.png")`
			)
		},
	},
}
