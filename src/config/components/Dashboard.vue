<template>
	<div class="dashboard">
		<div class="control-grid">
			<!-- Telestrator Board -->
			<div class="card --span-2">
				<div class="card-header">
					<h2>Analysis Board</h2>
					<div class="draw-tools">
						<div class="color-palette">
							<button 
								v-for="c in colors" 
								:key="c"
								:class="['color-swatch', { '--active': drawColor === c }]"
								:style="{ background: c }"
								@click="drawColor = c"
							></button>
						</div>
						<select v-model="drawSize" class="size-select">
							<option :value="2">Thin</option>
							<option :value="5">Medium</option>
							<option :value="10">Thick</option>
							<option :value="20">Marker</option>
						</select>
						<button class="btn-ghost" @click="clearCanvas">Clear</button>
					</div>
				</div>
				<div class="canvas-wrapper">
					<iframe src="/hud/?transparent" class="hud-preview-bg"></iframe>
					<canvas 
						ref="canvas"
						@mousedown="startDraw"
						@mousemove="draw"
						@mouseup="stopDraw"
						@mouseleave="stopDraw"
					></canvas>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="card">
				<div class="card-header">
					<h2>Live Control Scenes</h2>
				</div>
				<div class="scene-grid">
					<button 
						v-for="s in scenes" 
						:key="s.id"
						:class="['btn-scene', { '--active': state.options['match.activeScene'] === s.id }]"
						@click="setScene(s.id)"
					>
						{{ s.label }}
					</button>
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<h2>Komplettligaen Match</h2>
				</div>
				<div class="override-group">
					<label>GG Arena Match ID</label>
					<input v-model="komplettligaen.matchId" class="text-input" placeholder="256437">
				</div>
				<div class="button-row" style="margin-top: 12px;">
					<button class="btn-promo" @click="saveKomplettligaen" :disabled="komplettligaenLoading">Save Match</button>
					<button class="btn-win --clear" @click="testKomplettligaen" :disabled="komplettligaenLoading || !komplettligaen.matchId">Test</button>
				</div>
				<div class="kl-status" :class="{ '--error': komplettligaenError }">{{ komplettligaenStatus }}</div>
			</div>

			<!-- Manual Overrides -->
			<div class="card">
				<div class="card-header">
					<h2>Manual Overrides</h2>
				</div>
				<div class="override-group">
					<label>Force Win Celebration</label>
					<div class="button-row">
						<button :class="['btn-win', '--ct', { '--active': state.options['preferences.celebration.forceWinner'] === 'team2' }]" @click="setWinner('team2')">CT Win</button>
						<button :class="['btn-win', '--t', { '--active': state.options['preferences.celebration.forceWinner'] === 'team1' }]" @click="setWinner('team1')">T Win</button>
						<button :class="['btn-win', '--clear', { '--active': state.options['preferences.celebration.forceWinner'] === 'none' }]" @click="setWinner('none')">Auto</button>
						<button :class="['btn-win', '--hidden', { '--active': state.options['preferences.celebration.forceWinner'] === 'hidden' }]" @click="setWinner('hidden')">Hide</button>
					</div>
				</div>
				<div class="override-group" style="margin-top: 24px;">
					<label>Promotion Panel</label>
					<button 
						:class="['btn-promo', { '--active': state.options['promotion.visible'] }]"
						@click="togglePromotion"
					>
						{{ state.options['promotion.visible'] ? 'Hide Panel' : 'Show Panel' }}
					</button>
				</div>
			</div>

			<!-- Visual Style & Flair -->
			<div class="card">
				<div class="card-header">
					<h2>Visual Style & Flair</h2>
				</div>
				<div class="override-group">
					<label>HUD Theme</label>
					<select v-model="state.theme" @change="actions.save({ theme: state.theme })" class="style-select">
						<option value="default">Default</option>
					</select>
				</div>
				<div class="override-group" style="margin-top: 20px;">
					<label>HUD Style Preset</label>
					<div class="style-pill-grid">
						<button 
							v-for="style in uiStyleChoices" 
							:key="style.value"
							:class="['btn-style', { '--active': state.options['css.ui-style'] === style.value }]"
							@click="setUiStyle(style.value)"
						>
							{{ style.label }}
						</button>
					</div>
				</div>
				<div class="override-group" style="margin-top: 20px;">
					<label>Background Effect</label>
					<div class="style-pill-grid">
						<button 
							v-for="fx in vantaEffects" 
							:key="fx.value"
							:class="['btn-style', { '--active': (state.options['css.vanta-effect'] || 'net') === fx.value }]"
							@click="previewOption('css.vanta-effect', fx.value)"
						>{{ fx.label }}</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { state, actions } from '/config/store.js'

export default {
	setup() {
		return { state, actions }
	},
	data() {
		return {
			drawColor: '#ff5a00',
			drawSize: 5,
			isDrawing: false,
			lastX: 0,
			lastY: 0,
			colors: ['#ff5a00', '#3498db', '#2ecc71', '#f1c40f', '#ffffff', '#e74c3c', '#9b59b6', '#000000'],
			komplettligaen: { matchId: '', activeView: 'match' },
			komplettligaenLoading: false,
			komplettligaenStatus: '',
			komplettligaenError: false,
			scenes: [
				{ id: 'default', label: 'Live HUD' },
				{ id: 'radar', label: 'Full Radar' },
				{ id: 'intro', label: 'KL Match Overview' },
				{ id: 'halftime', label: 'KL Waiting' },
				{ id: 'fulltime', label: 'KL Result' },
				{ id: 'analytics', label: 'KL Table/Form' },
			],
			uiStyleChoices: [
				{ value: 'slanted', label: 'Default' },
				{ value: 'classic', label: 'Classic' },
				{ value: 'compact', label: 'Compact' },
				{ value: 'diagonal', label: 'Diagonal' },
				{ value: 'rounded', label: 'Rounded' },
			],
			vantaEffects: [
				{ value: 'net', label: 'Net' },
				{ value: 'cells', label: 'Cells' },
				{ value: 'waves', label: 'Waves' },
				{ value: 'birds', label: 'Birds' },
				{ value: 'clouds', label: 'Clouds' },
				{ value: 'topology', label: 'Topology' },
				{ value: 'dots', label: 'Dots' },
				{ value: 'halo', label: 'Halo' },
			],
		}
	},
	methods: {
		setScene(id) {
			state.options['match.activeScene'] = id
			actions.broadcast('match.activeScene', id)
			actions.save({ 'match.activeScene': id })
		},
		async loadKomplettligaen() {
			try {
				const res = await fetch('/config/komplettligaen')
				this.komplettligaen = await res.json()
			} catch (err) {
				this.komplettligaenStatus = 'Could not load Komplettligaen config'
				this.komplettligaenError = true
			}
		},
		async saveKomplettligaen() {
			this.komplettligaenLoading = true
			this.komplettligaenError = false
			this.komplettligaenStatus = 'Saving...'
			try {
				const res = await fetch('/config/komplettligaen', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(this.komplettligaen),
				})
				this.komplettligaen = await res.json()
				this.komplettligaenStatus = 'Saved. HUD scenes will refresh.'
			} catch (err) {
				this.komplettligaenStatus = 'Save failed'
				this.komplettligaenError = true
			} finally {
				this.komplettligaenLoading = false
			}
		},
		async testKomplettligaen() {
			this.komplettligaenLoading = true
			this.komplettligaenError = false
			this.komplettligaenStatus = 'Fetching...'
			try {
				const res = await fetch(`/api/komplettligaen/preview?matchId=${encodeURIComponent(this.komplettligaen.matchId)}`)
				const data = await res.json()
				if (!res.ok || data.error) throw new Error(data.error || 'Fetch failed')
				this.komplettligaenStatus = `${data.match.home.name} vs ${data.match.away.name}`
			} catch (err) {
				this.komplettligaenStatus = err.message || 'Fetch failed'
				this.komplettligaenError = true
			} finally {
				this.komplettligaenLoading = false
			}
		},
		setWinner(id) {
			state.options['preferences.celebration.forceWinner'] = id
			actions.broadcast('preferences.celebration.forceWinner', id)
			actions.save({ 'preferences.celebration.forceWinner': id })
		},
		togglePromotion() {
			const newVal = !state.options['promotion.visible']
			state.options['promotion.visible'] = newVal
			actions.broadcast('promotion.visible', newVal)
			actions.save({ 'promotion.visible': newVal })
		},
		getPos(e) {
			const rect = this.$refs.canvas.getBoundingClientRect()
			return {
				x: (e.clientX - rect.left) / rect.width,
				y: (e.clientY - rect.top) / rect.height
			}
		},
		startDraw(e) {
			this.isDrawing = true
			const pos = this.getPos(e)
			this.lastX = pos.x
			this.lastY = pos.y
		},
		draw(e) {
			if (!this.isDrawing) return
			const pos = this.getPos(e)
			const ctx = this.$refs.canvas.getContext('2d')
			const rect = this.$refs.canvas.getBoundingClientRect()
			
			// Local Draw
			ctx.beginPath()
			ctx.moveTo(this.lastX * rect.width, this.lastY * rect.height)
			ctx.lineTo(pos.x * rect.width, pos.y * rect.height)
			ctx.strokeStyle = this.drawColor
			ctx.lineWidth = this.drawSize
			ctx.lineCap = 'round'
			ctx.stroke()

			// Sync
			actions.broadcast('draw:line', {
				x1: this.lastX, y1: this.lastY,
				x2: pos.x, y2: pos.y,
				color: this.drawColor, size: this.drawSize
			})

			this.lastX = pos.x
			this.lastY = pos.y
		},
		stopDraw() { this.isDrawing = false },
		clearCanvas() {
			const ctx = this.$refs.canvas.getContext('2d')
			ctx.clearRect(0, 0, this.$refs.canvas.width, this.$refs.canvas.height)
			actions.broadcast('draw:clear')
		},
		setUiStyle(s) {
			state.options['css.ui-style'] = s
			actions.broadcast('css.ui-style', s)
			actions.save({ 'css.ui-style': s })
		},
		setOption(key, value) {
			state.options[key] = value
			actions.broadcast(key, value)
			actions.save({ [key]: value })
		},
		previewOption(key, value) {
			state.options[key] = value
			actions.broadcast(key, value)
		},
	},
	mounted() {
		const canvas = this.$refs.canvas
		const rect = canvas.getBoundingClientRect()
		canvas.width = rect.width
		canvas.height = rect.height
		this.loadKomplettligaen()
	}
}
</script>

<style scoped>
.control-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 24px;
}

.card {
	background: #1a1d23;
	border: 1px solid #2d333b;
	border-radius: 12px;
	padding: 24px;
}

.card.--span-2 { grid-column: span 2; }

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.card-header h2 { font-size: 1.1rem; font-weight: 600; color: #fff; margin: 0; }

.draw-tools { display: flex; align-items: center; gap: 16px; }

.color-palette { display: flex; gap: 4px; }
.color-swatch { 
	width: 20px; height: 20px; border-radius: 4px; border: 2px solid transparent; cursor: pointer;
}
.color-swatch.--active { border-color: #fff; }

.canvas-wrapper {
	position: relative;
	aspect-ratio: 16 / 9;
	background: #000;
	border-radius: 8px;
	overflow: hidden;
}

.hud-preview-bg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	border: none;
	pointer-events: none;
}

canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	cursor: crosshair;
}

.scene-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.btn-scene {
	padding: 12px;
	background: #2d333b;
	border: 1px solid transparent;
	border-radius: 6px;
	color: #adbac7;
	cursor: pointer;
	transition: all 0.2s;
}

.btn-scene:hover { background: #3e444d; color: #fff; }
.btn-scene.--active { background: #3498db; color: #fff; font-weight: 600; }

.override-group label { display: block; font-size: 0.8rem; color: #8b949e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }

.button-row { display: flex; gap: 8px; }
.btn-win { flex: 1; padding: 10px; border: 1px solid #30363d; border-radius: 6px; font-weight: 600; cursor: pointer; background: #2d333b; color: #adbac7; transition: all 0.2s; }

.btn-win.--ct.--active { background: #3498db; color: #fff; border-color: transparent; }
.btn-win.--t.--active { background: #e67e22; color: #fff; border-color: transparent; }
.btn-win.--clear.--active { background: #444c56; color: #fff; border-color: #539bf5; }
.btn-win.--hidden.--active { background: #e74c3c; color: #fff; border-color: transparent; }

.btn-win:hover:not(.--active) { background: #3e444d; color: #fff; }

.btn-promo { width: 100%; padding: 12px; background: #2d333b; border: 1px solid #3498db; color: #3498db; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-promo.--active { background: #3498db; color: #fff; }

.btn-ghost { background: none; border: 1px solid #2d333b; color: #8b949e; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.btn-ghost:hover { color: #fff; border-color: #444; }

.style-select {
	width: 100%;
	padding: 10px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 6px;
	color: #c9d1d9;
}

.text-input {
	width: 100%;
	box-sizing: border-box;
	padding: 10px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 6px;
	color: #c9d1d9;
}

.kl-status {
	min-height: 20px;
	margin-top: 10px;
	color: #8b949e;
	font-size: 0.9rem;
}

.kl-status.--error { color: #e74c3c; }

.style-pill-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.btn-style {
	padding: 8px;
	background: #2d333b;
	border: 1px solid transparent;
	border-radius: 4px;
	color: #adbac7;
	cursor: pointer;
	text-transform: capitalize;
}

.btn-style.--active {
	background: #3498db;
	color: #fff;
	font-weight: 600;
}
</style>
