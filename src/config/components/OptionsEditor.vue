<template>
	<div class="hud-options">
		<div v-if="isLoading" class="loading-overlay">
			<div class="spinner"></div>
			<span>Loading HUD options...</span>
		</div>

		<template v-else>
			<section class="panel">
				<header class="panel-header">
					<div>
						<h2>HUD Visibility</h2>
						<p>Turn overlay elements on or off while rehearsing, testing, or broadcasting.</p>
					</div>
					<button class="btn-secondary" @click="showAllElements">Show all</button>
				</header>

				<div class="visibility-grid">
					<label v-for="item in displayControls" :key="item.key" class="visibility-card">
						<span class="visibility-copy">
							<strong>{{ item.label }}</strong>
							<small>{{ item.description }}</small>
						</span>
						<span class="switch">
							<input type="checkbox" :checked="isDisplayVisible(item.key)" @change="setDisplayOption(item.key, $event.target.checked)">
							<span class="slider"></span>
						</span>
					</label>
				</div>
			</section>

			<section class="panel">
				<header class="panel-header">
					<div>
						<h2>Broadcast Behavior</h2>
						<p>Control when helper panels appear during freezetime, live rounds, timeouts, and round transitions.</p>
					</div>
				</header>

				<div class="settings-grid">
					<label v-for="item in behaviorSwitches" :key="item.key" class="setting-card --switch">
						<span>
							<strong>{{ item.label }}</strong>
							<small>{{ item.description }}</small>
						</span>
						<span class="switch">
							<input type="checkbox" v-model="state.options[item.key]" @change="saveOption(item.key)">
							<span class="slider"></span>
						</span>
					</label>

					<label v-for="item in behaviorNumbers" :key="item.key" class="setting-card">
						<span>
							<strong>{{ item.label }}</strong>
							<small>{{ item.description }}</small>
						</span>
						<div class="input-with-unit">
							<input v-model.number="state.options[item.key]" type="number" min="0" :step="item.step || 1" @change="saveOption(item.key)">
							<span>{{ item.unit }}</span>
						</div>
					</label>
				</div>
			</section>

			<section class="panel">
				<header class="panel-header">
					<div>
						<h2>Colors and Style</h2>
						<p>Adjust the main team colors and high-level HUD styling without touching CSS.</p>
					</div>
				</header>

				<div class="style-layout">
					<div class="style-column">
						<h3>Team Colors</h3>
						<div class="color-list">
							<label v-for="item in colorControls" :key="item.key" class="color-row">
								<span>{{ item.label }}</span>
								<input type="color" :value="colorValue(item.key)" @input="state.options[item.key] = $event.target.value" @change="saveOption(item.key)">
								<button class="btn-ghost" @click.prevent="resetOption(item.key)">Reset</button>
							</label>
						</div>
					</div>

					<div class="style-column">
						<h3>Shape and Scale</h3>
						<label class="field-row">
							<span>HUD style preset</span>
							<div class="segmented">
								<button v-for="choice in uiStyleChoices" :key="choice.value" :class="{ '--active': state.options['css.ui-style'] === choice.value }" @click="setOption('css.ui-style', choice.value)">
									{{ choice.label }}
								</button>
							</div>
						</label>

						<div class="font-card">
							<div>
								<strong>HUD font</strong>
								<small>Choose a bundled font or upload a local broadcast font.</small>
							</div>
							<div class="segmented">
								<button v-for="choice in fontChoices" :key="choice.value" :class="{ '--active': state.options['css.primary-font-family'] === choice.value }" @click="setFontPreset(choice.value)">
									{{ choice.label }}
								</button>
							</div>
							<div class="image-input-row">
								<input v-model="state.options['css.primary-font-family']" type="text" placeholder="Custom Font Name" @change="saveOption('css.primary-font-family')">
								<button class="btn-secondary" @click="triggerUpload('css.custom-font-url')">Upload font</button>
								<input ref="upload-css.custom-font-url" type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" class="hidden-file" @change="onFontSelected">
							</div>
							<small v-if="state.options['css.custom-font-url']">Using {{ state.options['css.custom-font-url'] }}</small>
						</div>

						<label v-for="item in styleTextControls" :key="item.key" class="field-row">
							<span>{{ item.label }}</span>
							<input v-model="state.options[item.key]" type="text" :placeholder="item.placeholder" @change="saveOption(item.key)">
						</label>
					</div>
				</div>
			</section>

			<section class="panel">
				<header class="panel-header">
					<div>
						<h2>Event Branding</h2>
						<p>Set the small event badge copy and logo used by the broadcast overlay.</p>
					</div>
				</header>

				<div class="branding-grid">
					<label v-for="item in brandingTextControls" :key="item.key" class="field-row">
						<span>{{ item.label }}</span>
						<input v-model="state.options[item.key]" type="text" @change="saveOption(item.key)">
					</label>

					<div class="logo-field">
						<label class="field-row">
							<span>Event logo</span>
							<div class="image-input-row">
								<input v-model="state.options['series.logoUrl']" type="text" placeholder="/hud/img/branding/logo.png" @change="saveOption('series.logoUrl')">
								<button class="btn-secondary" @click="triggerUpload('series.logoUrl')">Upload</button>
								<input ref="upload-series.logoUrl" type="file" accept="image/*" class="hidden-file" @change="onFileSelected($event, 'series.logoUrl')">
							</div>
						</label>
						<div v-if="state.options['series.logoUrl']" class="image-preview">
							<img :src="state.options['series.logoUrl']" alt="">
						</div>
					</div>
				</div>
			</section>

			<section class="panel">
				<header class="panel-header">
					<div>
						<h2>Advanced Options</h2>
						<p>Technical settings that are still backed by raw config keys. Keep these hidden for normal broadcast setup.</p>
					</div>
					<label class="advanced-toggle">
						<input type="checkbox" v-model="state.showAdvancedSettings">
						<span>Show advanced</span>
					</label>
				</header>

				<div v-if="state.showAdvancedSettings" class="advanced-area">
					<input v-model="searchQuery" class="search-input" type="text" placeholder="Search advanced settings...">

					<div class="advanced-list">
						<div v-for="opt in searchedAdvancedOptions" :key="opt.key" class="advanced-row">
							<div class="advanced-info">
								<strong>{{ opt.label || opt.key }}</strong>
								<code>{{ opt.key }}</code>
							</div>
							<div class="advanced-control">
								<select v-if="inputType(opt) === 'select'" v-model="state.options[opt.key]" @change="saveOption(opt.key)">
									<option v-for="choice in opt.options" :key="choiceValue(choice)" :value="choiceValue(choice)">
										{{ choiceLabel(choice) }}
									</option>
								</select>
								<label v-else-if="inputType(opt) === 'checkbox'" class="switch">
									<input type="checkbox" v-model="state.options[opt.key]" @change="saveOption(opt.key)">
									<span class="slider"></span>
								</label>
								<textarea v-else-if="inputType(opt) === 'textarea'" v-model="state.options[opt.key]" @change="saveOption(opt.key)"></textarea>
								<input v-else :type="inputType(opt)" v-model="state.options[opt.key]" @change="saveOption(opt.key)">
							</div>
							<button class="btn-ghost" @click="resetOption(opt.key)">Reset</button>
						</div>
					</div>

					<div v-if="!searchedAdvancedOptions.length" class="empty-state">No advanced settings match your search.</div>
				</div>
			</section>
		</template>
	</div>
</template>

<script>
import { state, actions } from '/config/store.js'

const displayControls = [
	{ key: 'css.lan66-radar-display', label: 'Radar', description: 'Map overview and player positions.' },
	{ key: 'css.lan66-top-bar-display', label: 'Top bar', description: 'Score, clock, team names, and round state.' },
	{ key: 'css.lan66-players-alive-display', label: 'Players alive', description: 'Small alive count panel.' },
	{ key: 'css.lan66-sidebar-left-display', label: 'Left roster', description: 'Left team player sidebar.' },
	{ key: 'css.lan66-sidebar-right-display', label: 'Right roster', description: 'Right team player sidebar.' },
	{ key: 'css.lan66-focused-player-display', label: 'Focused player', description: 'Observed player lower-third.' },
	{ key: 'css.lan66-event-badge-display', label: 'Event badge', description: 'Event logo and text block.' },
	{ key: 'css.lan66-current-map-display', label: 'Current map', description: 'Current map panel.' },
	{ key: 'css.lan66-sponsor-left-display', label: 'Left sponsor', description: 'Left sponsor slot.' },
	{ key: 'css.lan66-sponsor-right-display', label: 'Right sponsor', description: 'Right sponsor slot.' },
	{ key: 'css.lan66-maps-display', label: 'Series maps', description: 'Displays the match maps from Komplettligaen.' },
]

const behaviorSwitches = [
	{ key: 'preferences.playersAlive.showDuringFreezetime', label: 'Show players alive during freezetime', description: 'Keeps the alive count visible before the round starts.' },
	{ key: 'preferences.sidebar.teamGrenades.hideDuringRound', label: 'Hide team grenades during live round', description: 'Only show team grenade panels near round start.' },
	{ key: 'preferences.seriesGraph.showMapForOnlyMatch', label: 'Show map for Best of 1', description: 'Keeps the map panel in the series graph even for one-map matches.' },
	{ key: 'preferences.topBar.clock.tenSecondsRedInFreezetime', label: 'Red clock under 10s in freezetime', description: 'Highlights low freezetime.' },
	{ key: 'preferences.topBar.clock.tenSecondsRedInTacticalTimeout', label: 'Red clock under 10s in timeout', description: 'Highlights expiring tactical timeouts.' },
	{ key: 'preferences.topBar.clock.tenSecondsRedInRoundRestartDelay', label: 'Red clock after round end', description: 'Highlights short transition time.' },
	{ key: 'preferences.topBar.matchPointRounds.showDuringRound', label: 'Show first-to panel during round', description: 'Keeps overtime target information visible mid-round.' },
	{ key: 'preferences.topBar.teamLogos', label: 'Show team logos in Top Bar', description: 'Displays Komplettligaen team logos next to the names.' },
	{ key: 'preferences.topBar.swapScrapedTeams', label: 'Swap Home/Away branding', description: 'Manually swap the scraper mapping if team sides are flipped.' },
]

const behaviorNumbers = [
	{ key: 'preferences.sidebar.teamGrenades.activeIntoRoundSec', label: 'Team grenades stay visible for', description: 'How long grenade panels remain after the round starts.', unit: 'sec' },
	{ key: 'preferences.sidebar.teamEquipment.activeIntoRoundSec', label: 'Equipment stays visible for', description: 'How long team money and equipment remain after the round starts.', unit: 'sec' },
	{ key: 'preferences.topBar.team.roundWinnerPanel.showIntoFreezetimeSec', label: 'Round winner carries into freezetime', description: 'Use 0 to disable, or a large value to keep it all freezetime.', unit: 'sec' },
	{ key: 'preferences.focusedPlayer.maximumRedHealthPoints', label: 'Red focused-player HP threshold', description: 'HP at or below this value is treated as critical.', unit: 'HP' },
]

const colorControls = [
	{ key: 'css.counter-terrorists-fill-rgb', label: 'CT fill' },
	{ key: 'css.counter-terrorists-border-rgb', label: 'CT border' },
	{ key: 'css.counter-terrorists-text-rgb', label: 'CT text' },
	{ key: 'css.terrorists-fill-rgb', label: 'T fill' },
	{ key: 'css.terrorists-border-rgb', label: 'T border' },
	{ key: 'css.terrorists-text-rgb', label: 'T text' },
]

const styleTextControls = [
	{ key: 'css.radar-width', label: 'Radar width', placeholder: '18% or 320px' },
	{ key: 'css.ct-background', label: 'CT custom background', placeholder: 'linear-gradient(...)' },
	{ key: 'css.t-background', label: 'T custom background', placeholder: 'linear-gradient(...)' },
]

const brandingTextControls = [
	{ key: 'series.name.left', label: 'Event line left' },
	{ key: 'series.name.center', label: 'Event name' },
	{ key: 'series.name.right', label: 'Event line right' },
]

const handledKeys = new Set([
	...displayControls.map((item) => item.key),
	...behaviorSwitches.map((item) => item.key),
	...behaviorNumbers.map((item) => item.key),
	...colorControls.map((item) => item.key),
	...styleTextControls.map((item) => item.key),
	...brandingTextControls.map((item) => item.key),
	'css.primary-font-family',
	'css.custom-font-url',
	'series.logoUrl',
])

export default {
	setup() {
		return { state }
	},
	data() {
		return {
			isLoading: true,
			settingsIndex: {},
			searchQuery: '',
			displayControls,
			behaviorSwitches,
			behaviorNumbers,
			colorControls,
			styleTextControls,
			brandingTextControls,
			uiStyleChoices: [
				{ value: 'slanted', label: 'Default' },
				{ value: 'classic', label: 'Classic' },
				{ value: 'compact', label: 'Compact' },
				{ value: 'diagonal', label: 'Diagonal' },
				{ value: 'rounded', label: 'Rounded' },
			],
			fontChoices: [
				{ value: "'Quantico'", label: 'Quantico' },
				{ value: "'Noto Sans'", label: 'Noto Sans' },
				{ value: "'Arial Narrow'", label: 'Arial Narrow' },
			],
		}
	},
	computed: {
		advancedOptions() {
			return Object.values(this.settingsIndex)
				.filter((opt) => !handledKeys.has(opt.key))
				.filter((opt) => !['Teams', 'Series', 'Sponsors', 'Promotion', 'HUD Layout', 'Match Rules', 'Cvars'].includes(opt.section))
				.sort((a, b) => (a.section || '').localeCompare(b.section || '') || a.key.localeCompare(b.key))
		},
		searchedAdvancedOptions() {
			const query = this.searchQuery.trim().toLowerCase()
			if (!query) return this.advancedOptions
			return this.advancedOptions.filter((opt) => (
				(opt.label || '').toLowerCase().includes(query)
				|| opt.key.toLowerCase().includes(query)
				|| (opt.section || '').toLowerCase().includes(query)
			))
		},
	},
	async mounted() {
		await this.loadSettings()
	},
	methods: {
		async loadSettings() {
			try {
				const res = await fetch('/config/options')
				const json = await res.json()
				const index = {}

				for (const opt of json) {
					index[opt.key] = opt
					if (!(opt.key in state.options)) {
						state.options[opt.key] = opt.value ?? opt.fallback ?? null
					}
				}

				this.settingsIndex = index
			} catch (err) {
				console.error(err)
				actions.addAlert('Failed to load HUD options', 'error')
			} finally {
				this.isLoading = false
			}
		},
		inputType(opt) {
			switch (opt.type) {
				case 'boolean': return 'checkbox'
				case 'color': return 'color'
				case 'number': return 'number'
				case 'textarea': return 'textarea'
				case 'select': return 'select'
				default: return 'text'
			}
		},
		choiceValue(choice) {
			return typeof choice === 'object' ? choice.value : choice
		},
		choiceLabel(choice) {
			return typeof choice === 'object' ? choice.label : choice
		},
		colorValue(key) {
			const value = state.options[key]
			return typeof value === 'string' && value.startsWith('#') ? value : '#000000'
		},
		isDisplayVisible(key) {
			const value = state.options[key]
			return value !== 'none' && value !== false
		},
		setDisplayOption(key, visible) {
			this.setOption(key, visible ? 'flex' : 'none')
		},
		showAllElements() {
			const partial = {}
			for (const item of this.displayControls) {
				state.options[item.key] = 'flex'
				partial[item.key] = 'flex'
				actions.broadcast(item.key, 'flex')
			}
			actions.save(partial)
		},
		setOption(key, value) {
			state.options[key] = value
			this.saveOption(key)
		},
		setFontPreset(value) {
			state.options['css.custom-font-url'] = ''
			actions.broadcast('css.custom-font-url', '')
			actions.save({ 'css.custom-font-url': '' })
			this.setOption('css.primary-font-family', value)
		},
		resetOption(key) {
			state.options[key] = null
			actions.broadcast(key, null)
			actions.save({ [key]: null })
		},
		saveOption(key) {
			actions.broadcast(key, state.options[key])
			actions.save({ [key]: state.options[key] })
		},
		triggerUpload(key) {
			const ref = this.$refs[`upload-${key}`]
			const input = Array.isArray(ref) ? ref[0] : ref
			input?.click()
		},
		async onFileSelected(event, key) {
			const file = event.target.files[0]
			if (!file) return

			const reader = new FileReader()
			reader.onload = async (e) => {
				try {
					const res = await fetch('/config/upload-image', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ filename: file.name, base64: e.target.result }),
					})
					const json = await res.json()
					if (json.url) {
						this.setOption(key, json.url)
						actions.addAlert('Image uploaded successfully', 'success')
					}
				} catch (err) {
					console.error(err)
					actions.addAlert('Failed to upload image', 'error')
				}
			}
			reader.readAsDataURL(file)
		},
		async onFontSelected(event) {
			const file = event.target.files[0]
			if (!file) return

			const reader = new FileReader()
			reader.onload = async (e) => {
				try {
					const res = await fetch('/config/upload-font', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ filename: file.name, base64: e.target.result }),
					})
					const json = await res.json()
					if (json.url && json.fontFamily) {
						state.options['css.custom-font-url'] = json.url
						state.options['css.primary-font-family'] = json.fontFamily
						actions.broadcast('css.custom-font-url', json.url)
						actions.broadcast('css.primary-font-family', json.fontFamily)
						actions.save({
							'css.custom-font-url': json.url,
							'css.primary-font-family': json.fontFamily,
						})
						actions.addAlert('Font uploaded successfully', 'success')
					}
				} catch (err) {
					console.error(err)
					actions.addAlert('Failed to upload font', 'error')
				}
			}
			reader.readAsDataURL(file)
		},
	},
}
</script>

<style scoped>
.hud-options {
	display: flex;
	flex-direction: column;
	gap: 20px;
	max-width: 1280px;
}

.panel {
	background: #161b22;
	border: 1px solid #30363d;
	border-radius: 8px;
	padding: 20px;
}

.panel-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 18px;
}

.panel-header h2 {
	margin: 0 0 6px;
	color: #fff;
	font-size: 1.1rem;
}

.panel-header p {
	margin: 0;
	color: #8b949e;
	line-height: 1.45;
}

.visibility-grid,
.settings-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 12px;
}

.visibility-card,
.setting-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	min-height: 74px;
	padding: 14px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 8px;
}

.setting-card {
	align-items: flex-start;
	flex-direction: column;
}

.setting-card.--switch {
	flex-direction: row;
	align-items: center;
}

.visibility-copy,
.setting-card > span {
	min-width: 0;
}

strong {
	display: block;
	color: #d5dde6;
	font-size: 0.92rem;
	line-height: 1.25;
}

small {
	display: block;
	margin-top: 4px;
	color: #8b949e;
	font-size: 0.78rem;
	line-height: 1.35;
}

.switch {
	position: relative;
	display: inline-flex;
	width: 42px;
	height: 24px;
	flex: 0 0 42px;
}

.switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

.slider {
	position: absolute;
	inset: 0;
	cursor: pointer;
	background: #30363d;
	border-radius: 999px;
	transition: background 0.2s;
}

.slider::before {
	content: "";
	position: absolute;
	width: 18px;
	height: 18px;
	left: 3px;
	top: 3px;
	background: #c9d1d9;
	border-radius: 50%;
	transition: transform 0.2s;
}

.switch input:checked + .slider {
	background: #1f6feb;
}

.switch input:checked + .slider::before {
	transform: translateX(18px);
	background: #fff;
}

.input-with-unit {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	width: 100%;
	background: #090c10;
	border: 1px solid #30363d;
	border-radius: 6px;
	overflow: hidden;
}

.input-with-unit input {
	border: 0;
	background: transparent;
}

.input-with-unit span {
	padding: 0 10px;
	color: #8b949e;
	font-size: 0.82rem;
	border-left: 1px solid #30363d;
}

.style-layout {
	display: grid;
	grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
	gap: 24px;
}

.style-column h3 {
	margin: 0 0 12px;
	color: #adbac7;
	font-size: 0.85rem;
	text-transform: uppercase;
}

.font-card {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-bottom: 14px;
	padding: 12px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 8px;
}

.color-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.color-row,
.field-row {
	display: flex;
	flex-direction: column;
	gap: 7px;
	color: #adbac7;
	font-size: 0.86rem;
	font-weight: 600;
}

.color-row {
	display: grid;
	grid-template-columns: 1fr 44px auto;
	align-items: center;
	gap: 10px;
	padding: 10px 12px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 8px;
}

.color-row input[type="color"] {
	width: 44px;
	height: 34px;
	padding: 0;
	border: 1px solid #30363d;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
}

.branding-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(180px, 1fr));
	gap: 14px;
}

.logo-field {
	grid-column: 1 / -1;
	display: grid;
	grid-template-columns: minmax(320px, 1fr) 160px;
	gap: 14px;
	align-items: end;
}

.image-input-row {
	display: flex;
	gap: 8px;
}

.image-preview {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 74px;
	padding: 12px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 8px;
}

.image-preview img {
	max-width: 136px;
	max-height: 58px;
	object-fit: contain;
}

.segmented {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
	gap: 6px;
}

.segmented button,
.btn-secondary,
.btn-ghost {
	border: 1px solid #30363d;
	border-radius: 6px;
	padding: 8px 10px;
	color: #d5dde6;
	background: #21262d;
	cursor: pointer;
	font: inherit;
	white-space: nowrap;
}

.segmented button.--active {
	background: #1f6feb;
	border-color: #1f6feb;
	color: #fff;
}

.btn-secondary:hover,
.btn-ghost:hover,
.segmented button:hover {
	border-color: #58a6ff;
	color: #fff;
}

.btn-ghost {
	background: transparent;
	font-size: 0.82rem;
}

.advanced-toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	color: #adbac7;
	font-size: 0.9rem;
	font-weight: 600;
	white-space: nowrap;
}

.advanced-area {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.advanced-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.advanced-row {
	display: grid;
	grid-template-columns: minmax(240px, 1fr) minmax(240px, 0.9fr) auto;
	gap: 14px;
	align-items: center;
	padding: 12px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 8px;
}

.advanced-info code {
	display: block;
	margin-top: 4px;
	color: #58a6ff;
	font-size: 0.72rem;
	opacity: 0.8;
}

.advanced-control textarea {
	min-height: 74px;
	resize: vertical;
}

input,
select,
textarea,
.search-input {
	width: 100%;
	box-sizing: border-box;
	padding: 8px 12px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 6px;
	color: #c9d1d9;
	font: inherit;
}

input:focus,
select:focus,
textarea:focus {
	outline: none;
	border-color: #58a6ff;
	box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.18);
}

.hidden-file {
	display: none;
}

.loading-overlay,
.empty-state {
	padding: 40px;
	text-align: center;
	color: #8b949e;
}

.loading-overlay {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	min-height: 320px;
}

.spinner {
	width: 32px;
	height: 32px;
	border: 3px solid rgba(255, 255, 255, 0.1);
	border-top-color: #3498db;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
	.style-layout,
	.branding-grid,
	.logo-field,
	.advanced-row {
		grid-template-columns: 1fr;
	}

	.panel-header {
		flex-direction: column;
	}
}
</style>
