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
				<!-- High-Fidelity Workbench Toggles -->
				<div class="workbench-toggles">
					<label class="toggle-control" title="Show/Hide CS2 Gameplay Screenshot">
						<input type="checkbox" v-model="showBgImage">
						<span>🖼️ Background</span>
					</label>
					<label class="toggle-control" title="Show/Hide Technical Alignment Grid">
						<input type="checkbox" v-model="showGrid">
						<span>📐 Grid</span>
					</label>
					<label class="toggle-control" title="Show/Hide Center Crosshairs">
						<input type="checkbox" v-model="showCenterLines">
						<span>🎯 Center Lines</span>
					</label>
					<label class="toggle-control" title="Show/Hide 10% TV Safe Area Outline">
						<input type="checkbox" v-model="showSafeArea">
						<span>🛡️ Safe Area</span>
					</label>
					<label class="toggle-control" title="Enable/Disable Snapping to Grid">
						<input type="checkbox" v-model="snapEnabled">
						<span>🧲 Snap</span>
					</label>
				</div>
				
				<div class="grid-size-selector" style="display: flex; align-items: center; gap: 8px;">
					<span style="font-size: 0.8rem; color: #8b949e;">Grid Size:</span>
					<select v-model="gridIdx" class="grid-select">
						<option v-for="(size, idx) in gridSizes" :key="size" :value="idx">
							{{ size === 0 ? 'Off' : size + 'px' }}
						</option>
					</select>
				</div>
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
					<!-- Backdrop CS2 Screenshot (Visual only, does not affect values) -->
					<img 
						v-if="showBgImage" 
						src="https://csprofile.com/Images/Blog/best-cs2-screenshots/Screenshot_without_HUD.webp" 
						class="hud-screenshot-bg" 
						alt="CS2 Gameplay"
					/>
					
					<!-- Live HUD Overlay Frame -->
					<iframe src="/hud/?transparent" class="hud-bg"></iframe>
					
					<!-- Technical Alignment Grid -->
					<div v-if="showGrid" class="tech-grid"></div>
					
					<!-- Center Lines -->
					<div v-if="showCenterLines" class="center-lines">
						<div class="center-line --vertical"></div>
						<div class="center-line --horizontal"></div>
					</div>
					
					<!-- 10% Broadcast safe area outline -->
					<div v-if="showSafeArea" class="safe-area-outline">
						<span class="safe-area-label">90% Broadcast Safe Area</span>
					</div>
					
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
						<label>Anchor alignment</label>
						<div class="prop-row" style="color: #58a6ff; text-transform: capitalize;">
							⚓ {{ selectedElement.def.anchor.v }} {{ selectedElement.def.anchor.h }}
						</div>
					</div>
					
					<div class="prop-group">
						<label>Viewport Position (1080p)</label>
						<div class="prop-row">
							<span>X: {{ Math.round(selectedElement.left) }}px</span>
							<span>Y: {{ Math.round(selectedElement.top) }}px</span>
						</div>
					</div>
					
					<div class="prop-group">
						<label>Size Dimensions</label>
						<div class="prop-row">
							<span>W: {{ Math.round(selectedElement.w) }}px</span>
							<span>H: {{ Math.round(selectedElement.h) }}px</span>
						</div>
					</div>

					<button class="btn-secondary" style="width: 100%; margin-top: 8px;" @click="resetElement(selectedElement)">Reset to Default</button>
				</div>
			</aside>
		</div>
	</div>
</template>

<script>
import { state, actions } from '/config/store.js'

const VP_W = 1920, VP_H = 1080;

const DEFS = [
	{
		id: 'radar', label: 'Radar',
		color: 'rgba(52,152,219,0.3)', border: 'rgba(52,152,219,0.65)',
		baseW: 480, baseH: 480,
		anchor: { v: 'top', h: 'left' },
		props: [ { key: 'layout.radar.left', edge: 'left' }, { key: 'layout.radar.top', edge: 'top' } ],
		resizable: true, keepAspect: true,
		sizeKey: 'layout.radar.width', sizeUnit: '%', sizeRef: VP_W,
		visibleKey: 'layout.radar.visible'
	},
	{
		id: 'top-bar', label: 'Top Bar',
		color: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.35)',
		baseW: 960, baseH: 50,
		anchor: { v: 'top', h: 'center' },
		props: [{ key: 'layout.topbar.top', edge: 'top' }],
		visibleKey: 'layout.topbar.visible'
	},
	{
		id: 'players-alive', label: 'Players Alive',
		color: 'rgba(56,148,107,0.3)', border: 'rgba(56,148,107,0.65)',
		baseW: 110, baseH: 35,
		anchor: { v: 'top', h: 'right' },
		props: [ { key: 'layout.playersAlive.top', edge: 'top' }, { key: 'layout.playersAlive.right', edge: 'right' } ],
		visibleKey: 'layout.playersAlive.visible'
	},
	{
		id: 'sponsor-left', label: 'Sponsor Left',
		color: 'rgba(220,180,80,0.2)', border: 'rgba(220,180,80,0.5)',
		baseW: 130, baseH: 48,
		anchor: { v: 'top', h: 'left' },
		props: [ { key: 'layout.sponsorLeft.top', edge: 'top' }, { key: 'layout.sponsorLeft.left', edge: 'left' } ],
		resizable: true, sizeKey: 'style.sponsors.width', sizeUnit: 'rem',
		visibleKey: 'layout.sponsorLeft.visible'
	},
	{
		id: 'sponsor-right', label: 'Sponsor Right',
		color: 'rgba(220,180,80,0.2)', border: 'rgba(220,180,80,0.5)',
		baseW: 130, baseH: 48,
		anchor: { v: 'top', h: 'right' },
		props: [ { key: 'layout.sponsorRight.top', edge: 'top' }, { key: 'layout.sponsorRight.right', edge: 'right' } ],
		resizable: true, sizeKey: 'style.sponsors.width', sizeUnit: 'rem',
		visibleKey: 'layout.sponsorRight.visible'
	},
	{
		id: 'sidebar-left', label: 'Left Sidebar',
		color: 'rgba(240,151,37,0.22)', border: 'rgba(240,151,37,0.55)',
		baseW: 580, baseH: 200,
		anchor: { v: 'bottom', h: 'left' },
		props: [ { key: 'layout.sidebar.left', edge: 'left' }, { key: 'layout.sidebar.bottom', edge: 'bottom' } ],
		visibleKey: 'layout.sidebar.leftVisible'
	},
	{
		id: 'sidebar-right', label: 'Right Sidebar',
		color: 'rgba(240,151,37,0.22)', border: 'rgba(240,151,37,0.55)',
		baseW: 580, baseH: 200,
		anchor: { v: 'bottom', h: 'right' },
		props: [ { key: 'layout.sidebar.right', edge: 'right' }, { key: 'layout.sidebar.bottom', edge: 'bottom' } ],
		visibleKey: 'layout.sidebar.rightVisible'
	},
	{
		id: 'focused-player', label: 'Focused Player',
		color: 'rgba(155,89,182,0.22)', border: 'rgba(155,89,182,0.55)',
		baseW: 960, baseH: 70,
		anchor: { v: 'bottom', h: 'center' },
		props: [{ key: 'layout.focusedPlayer.bottom', edge: 'bottom' }],
		visibleKey: 'layout.focusedPlayer.visible'
	},
	{
		id: 'current-map', label: 'Current Map',
		color: 'rgba(100,180,240,0.18)', border: 'rgba(100,180,240,0.5)',
		baseW: 160, baseH: 90,
		anchor: { v: 'bottom', h: 'right' },
		props: [ { key: 'layout.currentMap.bottom', edge: 'bottom' }, { key: 'layout.currentMap.right', edge: 'right' } ],
		resizable: true, sizeKey: 'style.currentMap.width', sizeUnit: 'rem',
		visibleKey: 'layout.currentMap.visible'
	},
	{
		id: 'maps-sleek', label: 'Sleek Maps',
		color: 'rgba(79,227,193,0.18)', border: 'rgba(79,227,193,0.5)',
		baseW: 210, baseH: 20,
		anchor: { v: 'top', h: 'center' },
		props: [ { key: 'layout.mapsSleek.top', edge: 'top' }, { key: 'layout.mapsSleek.left', edge: 'left' } ],
		resizable: true, sizeKey: 'style.mapsSleek.scale', sizeUnit: '',
		visibleKey: 'layout.maps.visible'
	},
	{
		id: 'event-badge', label: 'Event Badge',
		color: 'rgba(231,76,60,0.22)', border: 'rgba(231,76,60,0.55)',
		baseW: 240, baseH: 45,
		anchor: { v: 'top', h: 'left' },
		props: [ { key: 'layout.eventBadge.top', edge: 'top' }, { key: 'layout.eventBadge.left', edge: 'left' } ],
		resizable: true, sizeKey: 'style.eventBadge.width', sizeUnit: 'rem',
		visibleKey: 'layout.eventBadge.visible'
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
			activePreset: '',
			
			// Visual state toggles for 1:1 layout view
			showBgImage: true,
			showGrid: true,
			showCenterLines: true,
			showSafeArea: true
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
				let bw = def.baseW, bh = def.baseH

				if (def.sizeKey) {
					const refSize = (def.sizeKey.includes('width') || def.sizeKey.includes('left') || def.sizeKey.includes('right')) ? VP_W : VP_H
					bw = this.evaluateCss(state.options[def.sizeKey], refSize, def.baseW)
					if (def.keepAspect) bh = bw * (def.baseH / def.baseW)
				}

				if (def.id.startsWith('sponsor-')) {
					bw = this.evaluateCss(state.options['style.sponsors.width'], VP_W, 130)
					bh = this.evaluateCss(state.options['style.sponsors.height'], VP_H, 48)
				}

				const positions = {}
				for (const p of def.props) {
					const refSize = (p.edge === 'top' || p.edge === 'bottom') ? VP_H : VP_W
					positions[p.edge] = this.evaluateCss(state.options[p.key], refSize, 11)
				}

				let w = bw, h = bh
				let top = 0, left = 0
				
				if (def.anchor.v === 'top') top = positions.top ?? 0
				else top = VP_H - (positions.bottom ?? 0) - h

				if (def.anchor.h === 'left') left = positions.left ?? 0
				else if (def.anchor.h === 'right') left = VP_W - (positions.right ?? 0) - w
				else left = (VP_W - w) / 2

				const visibleVal = state.options[def.visibleKey]
				const visible = visibleVal !== false && visibleVal !== 'none'
				return { def, top, left, w, h, baseW: bw, baseH: bh, scaleX: 1, scaleY: 1, visible }
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
			const val = el.visible ? 'flex' : 'none'
			state.options[el.def.visibleKey] = val
			actions.broadcast(el.def.visibleKey, val)
			actions.save({ [el.def.visibleKey]: val })
		},
		resetElement(el) {
			const partial = {}
			for (const p of el.def.props) { partial[p.key] = null; state.options[p.key] = null }
			if (el.def.sizeKey) { partial[el.def.sizeKey] = null; state.options[el.def.sizeKey] = null }
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
				initW: el.baseW, initH: el.baseH
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
				let newTop = this.drag.initTop + dy
				let newLeft = this.drag.initLeft + dx
				
				// Clamp values within 1920x1080 stage boundaries to prevent element loss
				newTop = Math.max(0, Math.min(VP_H - el.h, newTop))
				newLeft = Math.max(0, Math.min(VP_W - el.w, newLeft))

				// Lock horizontal position for center-anchored components unless they have horizontal props
				const hasHorizontal = el.def.props.some(p => p.edge === 'left' || p.edge === 'right')
				if (el.def.anchor.h === 'center' && !hasHorizontal) {
					newLeft = (VP_W - el.w) / 2
				}

				// Lock vertical position if there are no vertical keys mapped
				const hasVertical = el.def.props.some(p => p.edge === 'top' || p.edge === 'bottom')
				if (!hasVertical) {
					newTop = el.top
				}

				el.top = snap(newTop)
				el.left = snap(newLeft)
			} else if (this.drag.type === 'resize-x' || this.drag.type === 'resize-y') {
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

			actions.save(partial)
		},
		savePreset() {
			const name = prompt("Enter preset name:")
			if (!name) return
			const values = {}
			this.elements.forEach(el => {
				for (const p of el.def.props) values[p.key] = state.options[p.key]
				if (el.def.sizeKey) values[el.def.sizeKey] = state.options[el.def.sizeKey]
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

/* Workbench Toggles */
.workbench-toggles {
	display: flex;
	align-items: center;
	background: #161b22;
	border: 1px solid #30363d;
	border-radius: 6px;
	padding: 4px;
	gap: 4px;
}

.toggle-control {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 10px;
	border-radius: 4px;
	cursor: pointer;
	user-select: none;
	transition: background 0.15s;
}

.toggle-control:hover {
	background: #21262d;
}

.toggle-control input[type="checkbox"] {
	margin: 0;
	cursor: pointer;
}

.toggle-control span {
	font-size: 0.75rem;
	font-weight: 600;
	color: #adbac7;
}

.toggle-control input[type="checkbox"]:checked + span {
	color: #fff;
}

.grid-select {
	padding: 6px;
	background: #0d1117;
	border: 1px solid #30363d;
	color: #c9d1d9;
	border-radius: 4px;
	font-size: 0.75rem;
}

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
	background: #111;
	box-shadow: 0 0 40px rgba(0,0,0,0.8);
	transform-origin: center center;
}

/* Optional Background CS2 Screenshot */
.hud-screenshot-bg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	pointer-events: none;
	z-index: 1;
	opacity: 0.75;
}

.hud-bg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	border: none;
	pointer-events: none;
	z-index: 2;
}

/* Technical Alignment Grid styling */
.tech-grid {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 3;
	background-size: 40px 40px, 40px 40px, 10px 10px, 10px 10px;
	background-image: 
		linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
		linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
		linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
		linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
}

/* Center Crosshair Lines styling */
.center-lines {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 4;
}

.center-line {
	position: absolute;
	background: none;
}

.center-line.--vertical {
	left: 50%;
	top: 0;
	bottom: 0;
	width: 1px;
	border-left: 1px dashed rgba(52, 152, 219, 0.35);
}

.center-line.--horizontal {
	top: 50%;
	left: 0;
	right: 0;
	height: 1px;
	border-top: 1px dashed rgba(52, 152, 219, 0.35);
}

/* 10% TV safe area outline styling */
.safe-area-outline {
	position: absolute;
	left: 96px;
	top: 54px;
	width: 1728px;
	height: 972px;
	border: 1px dashed rgba(230, 126, 34, 0.35);
	pointer-events: none;
	z-index: 5;
	box-sizing: border-box;
}

.safe-area-label {
	position: absolute;
	top: 6px;
	left: 10px;
	font-size: 0.65rem;
	color: rgba(230, 126, 34, 0.5);
	text-transform: uppercase;
	font-weight: 600;
	letter-spacing: 0.05em;
}

.hud-el {
	position: absolute;
	border: 2px solid transparent;
	box-sizing: border-box;
	cursor: move;
	opacity: 0.7;
	transition: opacity 0.2s;
	z-index: 10;
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
