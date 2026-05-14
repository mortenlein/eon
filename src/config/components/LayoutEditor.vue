<template>
	<div class="layout-editor">
		<div class="editor-header">
			<div class="header-left">
				<h2>Layout Editor</h2>
				<div class="preset-controls">
					<select v-model="activePreset" @change="loadPreset">
						<option value="">-- Load Preset --</option>
						<option v-for="p in presets" :key="p.id" :value="p.id">{{ p.name }}</option>
					</select>
					<button class="btn-secondary" @click="savePreset">Save as Preset</button>
				</div>
			</div>
			<div class="header-right">
				<label class="toggle">
					<input type="checkbox" v-model="snapEnabled">
					Snap to Grid ({{ gridSizes[gridIdx] }}px)
				</label>
				<input type="range" v-model="gridIdx" min="0" :max="gridSizes.length - 1" step="1">
			</div>
		</div>

		<div class="editor-workspace">
			<!-- Canvas Area -->
			<div class="canvas-container" ref="container">
				<div 
					class="viewport" 
					id="viewport"
					:style="{ transform: `scale(${viewportScale})` }"
				>
					<iframe src="/hud/?transparent" class="hud-bg"></iframe>
					
					<!-- Draggable Elements -->
					<div 
						v-for="el in sortedElements" 
						:key="el.def.id"
						:class="['hud-el', { '--active': selectedId === el.def.id, '--hidden': !el.visible }]"
						:style="{
							top: `${el.top}px`,
							left: `${el.left}px`,
							width: `${el.w}px`,
							height: `${el.h}px`,
							borderColor: el.def.border
						}"
						@mousedown.stop="startDrag($event, el, 'move')"
					>
						<div class="mock-content" :style="{ transform: `scale(${el.scaleX}, ${el.scaleY})`, transformOrigin: getTransformOrigin(el.def.anchor.h) }">
							<div class="mock-box" :style="{ backgroundColor: el.def.color }">
								{{ el.def.label }}
							</div>
						</div>
						
						<!-- Resize Handles -->
						<template v-if="el.def.resizable && selectedId === el.def.id">
							<div 
								class="resize-handle --x" 
								:style="{ [el.def.anchor.h === 'left' || el.def.anchor.h === 'center' ? 'right' : 'left']: '-6px' }"
								@mousedown.stop="startDrag($event, el, 'resize-x')"
							></div>
							<div 
								v-if="!el.def.keepAspect"
								class="resize-handle --y" 
								@mousedown.stop="startDrag($event, el, 'resize-y')"
							></div>
						</template>
					</div>
				</div>
			</div>

			<!-- Properties Sidebar -->
			<aside class="properties-sidebar">
				<div class="sidebar-header">
					<h3>Elements</h3>
					<p class="sidebar-tip">Select items here if they are overlapping on the canvas.</p>
				</div>
				
				<div class="element-list">
					<div 
						v-for="el in elements" 
						:key="el.def.id"
						:class="['element-item', { '--active': selectedId === el.def.id }]"
						@click="selectElement(el.def.id)"
					>
						<span class="el-name">{{ el.def.label }}</span>
						<button 
							class="btn-icon" 
							@click.stop="toggleVisibility(el)"
							:title="el.visible ? 'Hide' : 'Show'"
						>
							{{ el.visible ? '👁️' : '👁️‍🗨️' }}
						</button>
					</div>
				</div>

				<div v-if="selectedElement" class="properties-panel">
					<h3>Properties: {{ selectedElement.def.label }}</h3>
					
					<div class="prop-group">
						<label>Position</label>
						<div class="prop-row">
							<span>X: {{ Math.round(selectedElement.left) }}</span>
							<span>Y: {{ Math.round(selectedElement.top) }}</span>
						</div>
					</div>
					
					<div class="prop-group">
						<label>Size</label>
						<div class="prop-row">
							<span>W: {{ Math.round(selectedElement.w) }}</span>
							<span>H: {{ Math.round(selectedElement.h) }}</span>
						</div>
					</div>

					<button class="btn-secondary" @click="resetElement(selectedElement)">Reset to Default</button>
				</div>
			</aside>
		</div>
	</div>
</template>

<script>
import { state, actions } from '/config/store.js'

// Simple implementation of the layout definitions from layout.js
const VP_W = 1920, VP_H = 1080;

const DEFS = [
	{
		id: 'radar', label: 'Radar',
		color: 'rgba(52,152,219,0.3)', border: 'rgba(52,152,219,0.65)',
		baseW: 480, baseH: 480,
		anchor: { v: 'top', h: 'left' },
		props: [ { key: 'css.lan66-radar-top', edge: 'top' }, { key: 'css.lan66-radar-left', edge: 'left' } ],
		resizable: true, keepAspect: true,
		sizeKey: 'css.radar-width', sizeUnit: '%', sizeRef: VP_W,
	},
	{
		id: 'top-bar', label: 'Top Bar',
		color: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.35)',
		baseW: 960, baseH: 50,
		anchor: { v: 'top', h: 'center' },
		props: [{ key: 'css.lan66-top-bar-top', edge: 'top' }],
		sizeKey: 'css.top-bar-width',
	},
	{
		id: 'players-alive', label: 'Players Alive',
		color: 'rgba(56,148,107,0.3)', border: 'rgba(56,148,107,0.65)',
		baseW: 110, baseH: 35,
		anchor: { v: 'top', h: 'right' },
		props: [ { key: 'css.lan66-players-alive-top', edge: 'top' }, { key: 'css.lan66-players-alive-right', edge: 'right' } ],
	},
	{
		id: 'sponsor-left', label: 'Sponsor Left',
		color: 'rgba(220,180,80,0.2)', border: 'rgba(220,180,80,0.5)',
		baseW: 130, baseH: 48,
		anchor: { v: 'top', h: 'left' },
		props: [ { key: 'css.lan66-sponsor-left-top', edge: 'top' }, { key: 'css.lan66-sponsor-left-left', edge: 'left' } ],
		resizable: true, sizeKey: 'css.sponsor-panel-width', sizeUnit: 'rem',
	},
	{
		id: 'sponsor-right', label: 'Sponsor Right',
		color: 'rgba(220,180,80,0.2)', border: 'rgba(220,180,80,0.5)',
		baseW: 130, baseH: 48,
		anchor: { v: 'top', h: 'right' },
		props: [ { key: 'css.lan66-sponsor-right-top', edge: 'top' }, { key: 'css.lan66-sponsor-right-right', edge: 'right' } ],
		resizable: true, sizeKey: 'css.sponsor-panel-width', sizeUnit: 'rem',
	},
	{
		id: 'sidebar-left', label: 'Left Sidebar',
		color: 'rgba(240,151,37,0.22)', border: 'rgba(240,151,37,0.55)',
		baseW: 580, baseH: 200,
		anchor: { v: 'bottom', h: 'left' },
		props: [ { key: 'css.lan66-sidebar-left', edge: 'left' }, { key: 'css.lan66-sidebar-bottom', edge: 'bottom' } ],
		resizable: true, scaleKeys: { x: 'css.lan66-sidebar-scale-x', y: 'css.lan66-sidebar-scale-y' },
	},
	{
		id: 'sidebar-right', label: 'Right Sidebar',
		color: 'rgba(240,151,37,0.22)', border: 'rgba(240,151,37,0.55)',
		baseW: 580, baseH: 200,
		anchor: { v: 'bottom', h: 'right' },
		props: [ { key: 'css.lan66-sidebar-right', edge: 'right' }, { key: 'css.lan66-sidebar-bottom', edge: 'bottom' } ],
		resizable: true, scaleKeys: { x: 'css.lan66-sidebar-scale-x', y: 'css.lan66-sidebar-scale-y' },
	},
	{
		id: 'focused-player', label: 'Focused Player',
		color: 'rgba(155,89,182,0.22)', border: 'rgba(155,89,182,0.55)',
		baseW: 960, baseH: 70,
		anchor: { v: 'bottom', h: 'center' },
		props: [{ key: 'css.lan66-focused-player-bottom', edge: 'bottom' }],
	},
	{
		id: 'current-map', label: 'Current Map',
		color: 'rgba(100,180,240,0.18)', border: 'rgba(100,180,240,0.5)',
		baseW: 160, baseH: 90,
		anchor: { v: 'bottom', h: 'right' },
		props: [ { key: 'css.lan66-current-map-bottom', edge: 'bottom' }, { key: 'css.lan66-current-map-right', edge: 'right' } ],
		resizable: true, sizeKey: 'css.lan66-current-map-width', sizeUnit: 'rem',
	},
	{
		id: 'maps-sleek', label: 'Sleek Maps',
		color: 'rgba(79,227,193,0.18)', border: 'rgba(79,227,193,0.5)',
		baseW: 210, baseH: 20,
		anchor: { v: 'top', h: 'center' },
		props: [ { key: 'css.lan66-maps-sleek-top', edge: 'top' }, { key: 'css.lan66-maps-sleek-left', edge: 'left' } ],
		resizable: true, sizeKey: 'css.lan66-maps-sleek-scale', sizeUnit: '', 
	},
	{
		id: 'event-badge', label: 'Event Badge',
		color: 'rgba(231,76,60,0.22)', border: 'rgba(231,76,60,0.55)',
		baseW: 240, baseH: 45,
		anchor: { v: 'top', h: 'left' },
		props: [ { key: 'css.lan66-event-badge-top', edge: 'top' }, { key: 'css.lan66-event-badge-left', edge: 'left' } ],
		resizable: true, sizeKey: 'css.lan66-event-badge-width', sizeUnit: 'rem',
	}
]

export default {
	setup() { return { state, actions } },
	data() {
		return {
			elements: [],
			selectedId: null,
			viewportScale: 1,
			gridSizes: [0, 5, 10, 20, 50],
			gridIdx: 2,
			snapEnabled: true,
			remPx: 10,
			drag: null,
			presets: [],
			activePreset: ''
		}
	},
	computed: {
		selectedElement() { return this.elements.find(e => e.def.id === this.selectedId) },
		sortedElements() {
			return [...this.elements].sort((a, b) => {
				if (a.def.id === this.selectedId) return 1
				if (b.def.id === this.selectedId) return -1
				return 0
			})
		}
	},
	mounted() {
		this.computeRemPx()
		this.initElements()
		this.resize()
		window.addEventListener('resize', this.resize)
		window.addEventListener('mousemove', this.onMouseMove)
		window.addEventListener('mouseup', this.onMouseUp)
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.resize)
		window.removeEventListener('mousemove', this.onMouseMove)
		window.removeEventListener('mouseup', this.onMouseUp)
	},
	methods: {
		computeRemPx() {
			const raw = String(state.options['css.base-scale-factor'] || '0.925925926vh')
			const val = parseFloat(raw)
			if (raw.includes('vh')) this.remPx = val * VP_H / 100
			else if (raw.includes('vw')) this.remPx = val * VP_W / 100
			else this.remPx = val || 10
		},
		evaluateCss(val, refSize = VP_W, fb = 0) {
			if (val == null || val === undefined) return fb
			let s = String(val).trim()
			if (!s) return fb

			let varMatch, safety = 0
			while ((varMatch = s.match(/var\(--(.+?)\)/)) && safety++ < 10) {
				const key = 'css.' + varMatch[1]
				let replacement = state.options[key] ?? state.options[varMatch[1]] ?? '0'
				s = s.replace(varMatch[0], replacement)
			}

			if (s.includes('clamp(')) {
				s = s.replace(/clamp\((.+?)\)/g, (match, inner) => {
					const parts = inner.split(',').map(p => this.evaluateCss(p.trim(), refSize, fb))
					return Math.max(parts[0], Math.min(parts[1], parts[2]))
				})
			}
			if (s.includes('calc(')) s = s.replace(/calc\((.+?)\)/g, (match, inner) => inner)

			const unitMap = { 'rem': this.remPx, 'vh': VP_H/100, 'vw': VP_W/100, 'px': 1, '%': refSize/100 }
			Object.entries(unitMap).forEach(([unit, mult]) => {
				const re = new RegExp(`([\\d\\.-]+)${unit === '%' ? '%' : unit}`, 'g')
				s = s.replace(re, (match, num) => parseFloat(num) * mult)
			})

			try {
				if (/^[ \d\.\-\+\*\/\(\)]+$/.test(s)) return new Function(`return (${s})`)()
			} catch(e) {}
			return parseFloat(s) || fb
		},
		resolveNum(key, fb) { const v = state.options[key]; return v != null ? (parseFloat(v) || fb) : fb },
		initElements() {
			this.elements = DEFS.map(def => {
				const scaleX = def.scaleKeys ? this.resolveNum(def.scaleKeys.x, 1) : 1
				const scaleY = def.scaleKeys ? this.resolveNum(def.scaleKeys.y, 1) : 1
				let bw = def.baseW, bh = def.baseH

				if (def.sizeKey) {
					const refSize = (def.sizeKey.includes('width') || def.sizeKey.includes('left') || def.sizeKey.includes('right')) ? VP_W : VP_H
					bw = this.evaluateCss(state.options[def.sizeKey], refSize, def.baseW)
					if (def.keepAspect) bh = bw * (def.baseH / def.baseW)
				}

				if (def.id.startsWith('sponsor-')) {
					bw = this.evaluateCss(state.options['css.sponsor-panel-width'], VP_W, 130)
					bh = this.evaluateCss(state.options['css.sponsor-panel-height'], VP_H, 48)
				}

				const positions = {}
				for (const p of def.props) {
					const refSize = (p.edge === 'top' || p.edge === 'bottom') ? VP_H : VP_W
					positions[p.edge] = this.evaluateCss(state.options[p.key], refSize, 11)
				}

				let w = bw * scaleX, h = bh * scaleY
				let top = 0, left = 0
				
				if (def.anchor.v === 'top') top = positions.top ?? 0
				else top = VP_H - (positions.bottom ?? 0) - h

				if (def.anchor.h === 'left') left = positions.left ?? 0
				else if (def.anchor.h === 'right') left = VP_W - (positions.right ?? 0) - w
				else left = (VP_W - w) / 2

				const visible = state.options[`css.lan66-${def.id}-display`] !== 'none'
				return { def, top, left, w, h, baseW: bw, baseH: bh, scaleX, scaleY, visible }
			})
		},
		getTransformOrigin(anchorH) {
			if (anchorH === 'left') return 'bottom left'
			if (anchorH === 'right') return 'bottom right'
			return 'bottom center'
		},
		selectElement(id) {
			this.selectedId = id
		},
		toggleVisibility(el) {
			el.visible = !el.visible
			const val = el.visible ? 'block' : 'none'
			state.options[`css.lan66-${el.def.id}-display`] = val
			actions.broadcast(`css.lan66-${el.def.id}-display`, val)
			actions.save({ [`css.lan66-${el.def.id}-display`]: val })
		},
		resetElement(el) {
			const partial = {}
			for (const p of el.def.props) { partial[p.key] = null; state.options[p.key] = null }
			if (el.def.sizeKey) { partial[el.def.sizeKey] = null; state.options[el.def.sizeKey] = null }
			if (el.def.scaleKeys) {
				partial[el.def.scaleKeys.x] = null; state.options[el.def.scaleKeys.x] = null
				partial[el.def.scaleKeys.y] = null; state.options[el.def.scaleKeys.y] = null
			}
			actions.save(partial)
			this.computeRemPx()
			this.initElements()
		},
		resize() {
			if (!this.$refs.container) return
			const rect = this.$refs.container.getBoundingClientRect()
			const scale = Math.min((rect.width - 40) / VP_W, (rect.height - 40) / VP_H)
			this.viewportScale = Math.max(0.1, scale)
		},
		startDrag(e, el, type) {
			this.selectedId = el.def.id
			this.drag = {
				el, type,
				startX: e.clientX, startY: e.clientY,
				initTop: el.top, initLeft: el.left,
				initW: el.baseW, initH: el.baseH,
				initScaleX: el.scaleX, initScaleY: el.scaleY
			}
		},
		onMouseMove(e) {
			if (!this.drag) return
			const dx = (e.clientX - this.drag.startX) / this.viewportScale
			const dy = (e.clientY - this.drag.startY) / this.viewportScale
			const el = this.drag.el
			const g = this.snapEnabled ? this.gridSizes[this.gridIdx] : 0
			const snap = v => (g ? Math.round(v / g) * g : v)

			if (this.drag.type === 'move') {
				el.top = snap(this.drag.initTop + dy)
				el.left = snap(this.drag.initLeft + dx)
			} else if (this.drag.type === 'resize-x' || this.drag.type === 'resize-y') {
				if (el.def.scaleKeys) {
					// Use scaling
					if (this.drag.type === 'resize-x') {
						const sign = (el.def.anchor.h === 'right') ? -1 : 1
						el.scaleX = Math.max(0.1, this.drag.initScaleX + (dx * sign / el.baseW))
						el.w = el.baseW * el.scaleX
					} else {
						el.scaleY = Math.max(0.1, this.drag.initScaleY - (dy / el.baseH))
						el.h = el.baseH * el.scaleY
					}
				} else {
					// Use direct width/height resizing
					if (this.drag.type === 'resize-x') {
						const sign = (el.def.anchor.h === 'right') ? -1 : 1
						el.baseW = snap(Math.max(20, this.drag.initW + dx * sign))
						el.w = el.baseW
						if (el.def.keepAspect) {
							el.baseH = el.baseW * (el.def.baseH / el.def.baseW)
							el.h = el.baseH
						}
					} else {
						el.baseH = snap(Math.max(20, this.drag.initH - dy))
						el.h = el.baseH
					}
				}
			}
		},
		onMouseUp() {
			if (!this.drag) return
			const el = this.drag.el
			this.drag = null

			// Save positions to state
			const partial = {}
			for (const prop of el.def.props) {
				let val = 0
				if (prop.edge === 'top') val = el.top
				else if (prop.edge === 'bottom') val = VP_H - el.top - el.h
				else if (prop.edge === 'left') val = el.left
				else if (prop.edge === 'right') val = VP_W - el.left - el.w
				
				const remVal = (val / this.remPx).toFixed(2) + 'rem'
				state.options[prop.key] = remVal
				partial[prop.key] = remVal
				actions.broadcast(prop.key, remVal)
			}

			if (el.def.sizeKey) {
				const unit = el.def.sizeUnit || 'px'
				let val = el.baseW
				if (unit === '%') val = (el.baseW / VP_W * 100).toFixed(2) + '%'
				else if (unit === 'rem') val = (el.baseW / this.remPx).toFixed(2) + 'rem'
				else val = Math.round(val) + 'px'

				state.options[el.def.sizeKey] = val
				partial[el.def.sizeKey] = val
				actions.broadcast(el.def.sizeKey, val)
			}

			if (el.def.scaleKeys) {
				state.options[el.def.scaleKeys.x] = el.scaleX.toFixed(3)
				state.options[el.def.scaleKeys.y] = el.scaleY.toFixed(3)
				partial[el.def.scaleKeys.x] = el.scaleX.toFixed(3)
				partial[el.def.scaleKeys.y] = el.scaleY.toFixed(3)
				actions.broadcast(el.def.scaleKeys.x, el.scaleX.toFixed(3))
				actions.broadcast(el.def.scaleKeys.y, el.scaleY.toFixed(3))
			}

			actions.save(partial)
		},
		savePreset() {
			const name = prompt("Enter preset name:")
			if (!name) return
			const values = {}
			this.elements.forEach(el => {
				for (const p of el.def.props) values[p.key] = state.options[p.key]
				if (el.def.sizeKey) values[el.def.sizeKey] = state.options[el.def.sizeKey]
				if (el.def.scaleKeys) {
					values[el.def.scaleKeys.x] = state.options[el.def.scaleKeys.x]
					values[el.def.scaleKeys.y] = state.options[el.def.scaleKeys.y]
				}
			})
			fetch('/config/layout-presets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, values })
			}).then(async res => {
				const p = await res.json()
				this.presets.push(p)
				this.activePreset = p.id
			})
		},
		loadPreset() {
			const p = this.presets.find(x => x.id === this.activePreset)
			if (!p) return
			Object.assign(state.options, p.values)
			actions.save(p.values)
			Object.entries(p.values).forEach(([k, v]) => actions.broadcast(k, v))
			this.computeRemPx()
			this.initElements()
		}
	}
}
</script>

<style scoped>
.layout-editor {
	display: flex;
	flex-direction: column;
	height: calc(100vh - 140px);
}

.editor-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24px;
}

.header-left h2 { margin: 0 0 8px 0; font-size: 1.2rem; color: #fff; }
.preset-controls { display: flex; gap: 12px; }
.preset-controls select { padding: 6px; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; border-radius: 4px; }

.btn-secondary { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.btn-secondary:hover { background: #30363d; color: #fff; }

.header-right { display: flex; align-items: center; gap: 16px; color: #8b949e; }

.editor-workspace {
	display: flex; gap: 24px; flex: 1; min-height: 0;
}

.canvas-container {
	flex: 1;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 8px;
	position: relative;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.viewport {
	width: 1920px;
	height: 1080px;
	position: relative;
	background: #222;
	box-shadow: 0 0 40px rgba(0,0,0,0.5);
	transform-origin: center center;
}

.hud-bg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	border: none;
	pointer-events: none;
}

.hud-el {
	position: absolute;
	border: 2px solid transparent;
	box-sizing: border-box;
	cursor: move;
	opacity: 0.7;
	transition: opacity 0.2s;
}

.hud-el:hover { opacity: 0.9; }
.hud-el.--hidden { opacity: 0.15; pointer-events: none; }
.hud-el.--active { border-style: dashed; z-index: 100; background: rgba(255,255,255,0.05); opacity: 1; }

.mock-content {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.mock-box {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.1em;
	font-size: 24px;
}

.resize-handle {
	position: absolute;
	background: #fff;
	border: 2px solid #3498db;
	z-index: 20;
}

.resize-handle.--x { width: 12px; height: 30px; top: calc(50% - 15px); cursor: ew-resize; }
.resize-handle.--y { width: 30px; height: 12px; left: calc(50% - 15px); top: -6px; cursor: ns-resize; }

.properties-sidebar {
	width: 320px;
	background: #161b22;
	border: 1px solid #30363d;
	border-radius: 8px;
	display: flex;
	flex-direction: column;
}

.sidebar-header { padding: 16px; border-bottom: 1px solid #30363d; }
.sidebar-header h3 { margin: 0 0 4px 0; font-size: 1rem; color: #fff; }
.sidebar-tip { margin: 0; font-size: 0.75rem; color: #8b949e; line-height: 1.3; }

.element-list {
	flex: 1;
	overflow-y: auto;
	padding: 8px;
}

.element-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 12px;
	margin-bottom: 4px;
	border-radius: 6px;
	cursor: pointer;
	color: #adbac7;
}

.element-item:hover { background: #21262d; color: #fff; }
.element-item.--active { background: #3498db; color: #fff; }

.btn-icon { background: none; border: none; cursor: pointer; filter: grayscale(1); }
.element-item.--active .btn-icon { filter: none; }

.properties-panel {
	padding: 16px;
	border-top: 1px solid #30363d;
	background: #0d1117;
	border-radius: 0 0 8px 8px;
}

.properties-panel h3 { margin: 0 0 16px 0; font-size: 0.95rem; color: #fff; }

.prop-group { margin-bottom: 16px; }
.prop-group label { display: block; font-size: 0.8rem; color: #8b949e; margin-bottom: 8px; text-transform: uppercase; }

.prop-row { display: flex; gap: 16px; font-family: monospace; color: #c9d1d9; }
</style>
