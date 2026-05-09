import Corners from '/hud/corners/corners.vue'
import FocusedPlayer from '/hud/focused-player/focused-player.vue'
import MvpCard from '/hud/mvp-card/mvp-card.vue'
import MapWinner from '/hud/map-winner/map-winner.vue'
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
		MapWinner,
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
		komplettligaenView() {
			const scene = this.$opts?.['match.activeScene']
			if (scene === 'intro') return 'match'
			if (scene === 'halftime') return 'waiting'
			if (scene === 'fulltime' || scene === 'over') return 'result'
			if (scene === 'analytics') return 'table'
			return this.komplettligaen?.config?.activeView || 'match'
		},

		komplettligaenMatch() {
			return this.komplettligaen?.data?.match
		},

		komplettligaenTableRows() {
			return this.komplettligaen?.data?.table?.rows || []
		},

		komplettligaenTeamGames() {
			return this.komplettligaen?.data?.teamGames?.teams || []
		},

		komplettligaenMatchDetail() {
			const match = this.komplettligaenMatch
			if (!match) return { label: '', homeScore: '', awayScore: '', hasScore: false }

			if (match.currentMap) {
				return {
					label: match.currentMap.name || `Map ${match.currentMap.number || ''}`.trim(),
					homeScore: match.currentMap.homeScore ?? '-',
					awayScore: match.currentMap.awayScore ?? '-',
					hasScore: true,
				}
			}

			if (match.matchWinner) {
				return { label: `${match[match.matchWinner].name} wins`, homeScore: '', awayScore: '', hasScore: false }
			}

			const startsAt = match.startsAt ? new Date(match.startsAt) : null
			if (startsAt && !Number.isNaN(startsAt.getTime()) && new Date() < startsAt) {
				return { label: this.formatKomplettligaenDate(match.startsAt), homeScore: '', awayScore: '', hasScore: false }
			}

			return { label: '', homeScore: '', awayScore: '', hasScore: false }
		},

		komplettligaenMatchState() {
			const match = this.komplettligaenMatch
			if (!match) return ''
			if (match.matchWinner) return `${match[match.matchWinner].name} wins`
			if (match.currentMap) {
				return `${match.currentMap.name || `Map ${match.currentMap.number || ''}`.trim()} ${match.currentMap.homeScore ?? '-'}-${match.currentMap.awayScore ?? '-'}`
			}
			const startsAt = match.startsAt ? new Date(match.startsAt) : null
			if (startsAt && !Number.isNaN(startsAt.getTime()) && new Date() < startsAt) return this.formatKomplettligaenDate(match.startsAt)
			return `BO${match.bestOf || 3}`
		},

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

	data() {
		return {
			komplettligaen: null,
		}
	},

	mounted() {
		this.applyCssVariableOverrides()
		this.applyCustomFontFace()
		this.setScaleFactor()
		this.setMapImageUrl()

		window.addEventListener('resize', this.setScaleFactor)
		this.loadKomplettligaen()
	},

	watch: {
		'$opts': {
			handler() {
				this.applyCssVariableOverrides()
				this.applyCustomFontFace()
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
		async loadKomplettligaen() {
			try {
				const response = await fetch('/api/komplettligaen')
				this.komplettligaen = await response.json()
				this.setMapImageUrl()
			} catch (err) {
				this.komplettligaen = null
			}
		},

		formatKomplettligaenDate(value) {
			if (!value) return 'TBD'
			const date = new Date(value)
			if (Number.isNaN(date.getTime())) return 'TBD'

			return new Intl.DateTimeFormat('en-GB', {
				day: '2-digit',
				month: 'short',
				hour: '2-digit',
				minute: '2-digit',
				hourCycle: 'h23',
				timeZone: 'Europe/Oslo',
			}).format(date)
		},

		isFeaturedKomplettligaenTeam(team) {
			return team?.name === '6614Gamers'
		},

		isFeaturedTableRow(row) {
			const names = [this.komplettligaenMatch?.home?.name, this.komplettligaenMatch?.away?.name].filter(Boolean)
			return names.includes(row.team) || String(row.team || '').includes('6614Gamers')
		},

		mapBackgroundStyle(map) {
			if (!map?.image) return {}
			return {
				backgroundImage: `linear-gradient(90deg, rgba(7, 13, 23, 0.82), rgba(7, 13, 23, 0.55)), url("${map.image}")`,
			}
		},

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

		applyCustomFontFace() {
			const styleId = 'eon-custom-hud-font'
			const existing = document.getElementById(styleId)
			const fontUrl = this.$opts?.['css.custom-font-url']
			const fontFamily = this.$opts?.['css.primary-font-family']

			if (!fontUrl || !fontFamily || !String(fontUrl).startsWith('/hud/')) {
				existing?.remove()
				return
			}

			const safeFamily = String(fontFamily).replace(/[^a-z0-9 _-]/gi, '').trim()
			const safeUrl = String(fontUrl).replace(/["'\\()]/g, '')
			if (!safeFamily || !safeUrl) {
				existing?.remove()
				return
			}

			const style = existing || document.createElement('style')
			style.id = styleId
			style.textContent = `@font-face { font-family: "${safeFamily}"; src: url("${safeUrl}"); font-weight: 100 900; font-style: normal; font-display: swap; }`
			if (!existing) document.head.appendChild(style)
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
			const raw = getComputedStyle(document.documentElement).getPropertyValue('--base-scale-factor').trim() || '0.9259vh'
			const baseValue = parseFloat(raw)
			const unitMatch = raw.match(/\D+$/)
			const baseUnit = unitMatch ? unitMatch[0] : 'px'

			switch (baseUnit) {
				case 'vh': return `${Math.round(window.innerHeight / 100 * baseValue)}px`
				case 'vw': return `${Math.round(window.innerWidth / 100 * baseValue)}px`
				default: return isNaN(baseValue) ? '10px' : `${baseValue}px`
			}
		},

		setMapImageUrl() {
			const komplettligaenMapImage = this.komplettligaenMatch?.currentMap?.image
				|| this.komplettligaenMatch?.maps?.find?.((map) => map.image)?.image
			if (komplettligaenMapImage && !this.$map?.sanitizedName) {
				document.documentElement.style.setProperty('--map-image-url', `url("${komplettligaenMapImage}")`)
				return
			}

			if (!this.$map?.sanitizedName) return
			document.documentElement.style.setProperty(
				'--map-image-url',
				`url("/hud/img/maps/${this.$map.sanitizedName}.png")`
			)
		},
	},
}


