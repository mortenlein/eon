<template>
	<div class="theme-designer">
		<section class="designer-grid">
			
			<!-- LEFT COLUMN: Theme Catalog & Workspace Actions -->
			<div class="left-column">
				<div class="card catalog-card">
					<div class="card-header">
						<h3>Visual Event Themes</h3>
						<button class="btn-win --clear" style="padding: 4px 10px; font-size: 0.75rem;" @click="fetchThemes">🔄 Refresh</button>
					</div>
					
					<p class="section-desc">Select a built-in preset or load/create custom themes. Press "Apply Theme" to push styles to live HUD overlays.</p>
					
					<div class="themes-list">
						<!-- Built-in presets -->
						<div class="group-title">Static Presets</div>
						<div 
							v-for="theme in presets" 
							:key="theme.id"
							:class="['theme-item', { '--active': activeTheme.id === theme.id }]"
							@click="loadTheme(theme)"
						>
							<div class="theme-item-meta">
								<strong style="color: #fff;">{{ theme.name }}</strong>
								<span>{{ theme.description }}</span>
							</div>
							<span class="badge --preset">Preset</span>
						</div>
						
						<!-- Custom themes -->
						<div class="group-title" style="margin-top: 16px;">Custom Operator Themes</div>
						<div v-if="customThemes.length > 0">
							<div 
								v-for="theme in customThemes" 
								:key="theme.id"
								:class="['theme-item', { '--active': activeTheme.id === theme.id }]"
								@click="loadTheme(theme)"
							>
								<div class="theme-item-meta">
									<strong style="color: #58a6ff;">{{ theme.name }}</strong>
									<span>{{ theme.description || 'Custom operator theme' }}</span>
								</div>
								<span class="badge --custom">Custom</span>
							</div>
						</div>
						<div v-else class="empty-list-notice">
							No custom themes found. Click "Create Custom Theme" to start.
						</div>
					</div>

					<div class="designer-actions">
						<button class="btn-win --clear" style="width: 100%; font-size: 0.85rem;" @click="clearForNew">➕ Create Custom Theme</button>
						<button class="btn-promo" style="width: 100%; font-size: 0.85rem;" @click="saveTheme" :disabled="loading">💾 Save Theme</button>
						<button class="btn-win --clear" style="width: 100%; font-size: 0.85rem;" @click="duplicateTheme" :disabled="!activeTheme.id || loading">👥 Duplicate</button>
						<button class="btn-win --hidden" style="width: 100%; font-size: 0.85rem;" @click="deleteTheme" :disabled="!activeTheme.isCustom || loading">🗑️ Delete Theme</button>
						<button class="btn-primary" style="width: 100%; margin-top: 8px; font-size: 0.9rem;" @click="applyTheme" :disabled="!activeTheme.id || loading">⚡ Apply Theme to Overlays</button>
					</div>
				</div>
			</div>

			<!-- RIGHT COLUMN: Tabbed Editor & Live Mockup Preview -->
			<div class="right-column">
				
				<!-- Mock HUD Live Preview Card -->
				<div class="card mockup-preview-card" style="margin-bottom: 24px;">
					<div class="card-header">
						<h3>Instant CSS Mockup Preview</h3>
						<span style="font-size: 0.75rem; color: #8b949e;">(Visual Mockup ONLY — Local preview changes update live)</span>
					</div>
					
					<div class="hud-mockup" :style="mockupStyles">
						<div class="hud-bar">
							<!-- Left Event Logo and Copy slot -->
							<div class="hud-brand-container">
								<img class="hud-logo" :src="activeTheme.event.logo || '/hud/img/branding/logo-ubg.png'" alt="Logo" />
								<div class="hud-event-copy">
									<div class="hud-event-name">{{ activeTheme.event.name || 'Eon Tournament' }}</div>
									<div class="hud-event-subtitle">{{ activeTheme.event.subtitle || 'Broadcast HUD' }}</div>
								</div>
							</div>
							
							<div class="hud-teams-container">
								<!-- CT Score section -->
								<div class="hud-team hud-team-ct">
									<span class="hud-team-name">CT TEAM</span>
									<span class="hud-score">12</span>
								</div>
								
								<!-- Round Clock section -->
								<div class="hud-clock-section">
									<span class="hud-clock">1:40</span>
									<span class="hud-round-count">Round 23</span>
								</div>
								
								<!-- T Score section -->
								<div class="hud-team hud-team-t">
									<span class="hud-score">10</span>
									<span class="hud-team-name">T TEAM</span>
								</div>
							</div>
							
							<!-- Sponsor Highlight Slot -->
							<div class="hud-sponsor-tag">
								<span>{{ activeTheme.event.sponsorFlavor || 'Eon Broadcast' }}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Tabbed Editor Panel -->
				<div class="card editor-card">
					<div class="editor-tabs">
						<button 
							v-for="t in tabs" 
							:key="t.id"
							:class="['tab-button', { '--active': activeTab === t.id }]"
							@click="activeTab = t.id"
						>
							{{ t.label }}
						</button>
					</div>

					<div class="editor-body">
						
						<!-- BRANDING SECTION -->
						<div v-if="activeTab === 'branding'" class="editor-section">
							<h4>Branding & Metadata</h4>
							
							<div class="form-row">
								<div class="form-group">
									<label>Event Name</label>
									<input v-model="activeTheme.event.name" class="text-input" placeholder="Eon Autumn League">
								</div>
								<div class="form-group">
									<label>Event Subtitle</label>
									<input v-model="activeTheme.event.subtitle" class="text-input" placeholder="Grand Finals 2026">
								</div>
							</div>
							
							<div class="form-row" style="margin-top: 12px;">
								<div class="form-group">
									<label>Branding Logo URL</label>
									<input v-model="activeTheme.event.logo" class="text-input" placeholder="/hud/img/branding/logo-ubg.png">
								</div>
								<div class="form-group">
									<label>Sponsor Text Highlight</label>
									<input v-model="activeTheme.event.sponsorFlavor" class="text-input" placeholder="Presented by Sponsor">
								</div>
							</div>
							
							<div class="form-row" style="margin-top: 12px;">
								<div class="form-group">
									<label>Theme Name</label>
									<input v-model="activeTheme.name" class="text-input" placeholder="Theme Title" :disabled="!activeTheme.isCustom">
								</div>
								<div class="form-group">
									<label>Theme Description</label>
									<input v-model="activeTheme.description" class="text-input" placeholder="Brief description..." :disabled="!activeTheme.isCustom">
								</div>
							</div>
						</div>

						<!-- COLORS SECTION -->
						<div v-if="activeTab === 'colors'" class="editor-section">
							<h4>Color Palettes</h4>
							<p class="field-desc">Choose CT and T visual tones. Inputs support standard RGB comma lists ("R, G, B").</p>
							
							<!-- CT Colors -->
							<div class="color-row">
								<div class="color-picker-wrapper">
									<label>CT Fill</label>
									<div class="picker-controls">
										<input type="color" :value="rgbToHex(activeTheme.tokens['theme.colors.ctFill'])" @input="updateColorToken('theme.colors.ctFill', $event.target.value)" />
										<input type="text" v-model="activeTheme.tokens['theme.colors.ctFill']" class="text-input --color-text" placeholder="25, 106, 232">
									</div>
								</div>
								<div class="color-picker-wrapper">
									<label>CT Border</label>
									<div class="picker-controls">
										<input type="color" :value="rgbToHex(activeTheme.tokens['theme.colors.ctBorder'])" @input="updateColorToken('theme.colors.ctBorder', $event.target.value)" />
										<input type="text" v-model="activeTheme.tokens['theme.colors.ctBorder']" class="text-input --color-text" placeholder="91, 166, 255">
									</div>
								</div>
								<div class="color-picker-wrapper">
									<label>CT Text</label>
									<div class="picker-controls">
										<input type="color" :value="rgbToHex(activeTheme.tokens['theme.colors.ctText'])" @input="updateColorToken('theme.colors.ctText', $event.target.value)" />
										<input type="text" v-model="activeTheme.tokens['theme.colors.ctText']" class="text-input --color-text" placeholder="156, 204, 255">
									</div>
								</div>
							</div>

							<!-- T Colors -->
							<div class="color-row" style="margin-top: 16px;">
								<div class="color-picker-wrapper">
									<label>T Fill</label>
									<div class="picker-controls">
										<input type="color" :value="rgbToHex(activeTheme.tokens['theme.colors.tFill'])" @input="updateColorToken('theme.colors.tFill', $event.target.value)" />
										<input type="text" v-model="activeTheme.tokens['theme.colors.tFill']" class="text-input --color-text" placeholder="232, 137, 22">
									</div>
								</div>
								<div class="color-picker-wrapper">
									<label>T Border</label>
									<div class="picker-controls">
										<input type="color" :value="rgbToHex(activeTheme.tokens['theme.colors.tBorder'])" @input="updateColorToken('theme.colors.tBorder', $event.target.value)" />
										<input type="text" v-model="activeTheme.tokens['theme.colors.tBorder']" class="text-input --color-text" placeholder="255, 181, 71">
									</div>
								</div>
								<div class="color-picker-wrapper">
									<label>T Text</label>
									<div class="picker-controls">
										<input type="color" :value="rgbToHex(activeTheme.tokens['theme.colors.tText'])" @input="updateColorToken('theme.colors.tText', $event.target.value)" />
										<input type="text" v-model="activeTheme.tokens['theme.colors.tText']" class="text-input --color-text" placeholder="255, 214, 138">
									</div>
								</div>
							</div>

							<!-- Alert & Accents -->
							<div class="color-row" style="margin-top: 16px;">
								<div class="color-picker-wrapper">
									<label>Neutral Accent Tint</label>
									<div class="picker-controls">
										<input type="color" v-model="activeTheme.event.accentColor" />
										<input type="text" v-model="activeTheme.event.accentColor" class="text-input --color-text" placeholder="#58a6ff">
									</div>
								</div>
								<div class="color-picker-wrapper">
									<label>Red Alert</label>
									<div class="picker-controls">
										<input type="color" :value="rgbToHex(activeTheme.tokens['theme.colors.red'])" @input="updateColorToken('theme.colors.red', $event.target.value)" />
										<input type="text" v-model="activeTheme.tokens['theme.colors.red']" class="text-input --color-text" placeholder="240, 49, 37">
									</div>
								</div>
								<div class="color-picker-wrapper">
									<label>Green Success</label>
									<div class="picker-controls">
										<input type="color" :value="rgbToHex(activeTheme.tokens['theme.colors.green'])" @input="updateColorToken('theme.colors.green', $event.target.value)" />
										<input type="text" v-model="activeTheme.tokens['theme.colors.green']" class="text-input --color-text" placeholder="56, 148, 107">
									</div>
								</div>
							</div>
						</div>

						<!-- SHAPES SECTION -->
						<div v-if="activeTab === 'shapes'" class="editor-section">
							<h4>Shapes & Boundaries</h4>
							
							<div class="slider-group">
								<div class="slider-header">
									<label>Border Corner Radius</label>
									<span class="value-readout">{{ radiusVal }}px</span>
								</div>
								<input type="range" min="0" max="20" v-model="radiusVal" @input="updateRadiusToken" class="designer-slider" />
								<p class="slider-desc">Sets the roundness boundary for panel containers and player cards.</p>
							</div>

							<div class="slider-group" style="margin-top: 20px;">
								<div class="slider-header">
									<label>Skew / Slant Angle</label>
									<span class="value-readout">{{ skewVal }}deg</span>
								</div>
								<input type="range" min="-30" max="30" v-model="skewVal" @input="updateSkewToken" class="designer-slider" />
								<p class="slider-desc">Sets Eon's visual slash layout angle. Negative angles skew leftward.</p>
							</div>
						</div>

						<!-- MATERIALS SECTION -->
						<div v-if="activeTab === 'materials'" class="editor-section">
							<h4>Materials Glassmorphism</h4>
							
							<div class="slider-group">
								<div class="slider-header">
									<label>Panel Fill Backdrop Opacity</label>
									<span class="value-readout">{{ Math.round(fillOpacity * 100) }}%</span>
								</div>
								<input type="range" min="0" max="1" step="0.01" v-model="fillOpacity" @input="updateFillOpacityToken" class="designer-slider" />
								<p class="slider-desc">Controls the alpha opacity transparency of backing containers.</p>
							</div>

							<div class="slider-group" style="margin-top: 20px;">
								<div class="slider-header">
									<label>Panel Border Opacity</label>
									<span class="value-readout">{{ Math.round(borderOpacity * 100) }}%</span>
								</div>
								<input type="range" min="0" max="1" step="0.01" v-model="borderOpacity" @input="updateBorderOpacityToken" class="designer-slider" />
								<p class="slider-desc">Controls panel outline stroke visibility (alpha level in rgba).</p>
							</div>
						</div>

						<!-- TYPOGRAPHY SECTION -->
						<div v-if="activeTab === 'typography'" class="editor-section">
							<h4>Typography & Fonts</h4>
							<p class="field-desc" style="color: #e67e22;">⚠️ Network Constraint: External web font URLs (e.g. Google Fonts) are forbidden. Only offline-safe local fonts served from `/hud/` are allowed.</p>
							
							<div class="form-group">
								<label>Primary Font Family</label>
								<input v-model="activeTheme.tokens['theme.typography.primaryFont']" class="text-input" placeholder="e.g. 'Quantico', 'Outfit', 'Arial Narrow'">
							</div>

							<div class="form-group" style="margin-top: 16px;">
								<label>Local Font File URL Path (Offline-Safe Only)</label>
								<input v-model="activeTheme.tokens['theme.typography.customFontUrl']" class="text-input" placeholder="e.g. /hud/fonts/my-font.woff2">
								<p class="field-desc" style="margin-top: 4px;">Must start with `/hud/`. You can upload custom font files under the "Import / Export" tab.</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
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
			loading: false,
			presets: [],
			customThemes: [],
			activeTheme: {
				id: '',
				name: '',
				description: '',
				isCustom: true,
				event: {
					name: '',
					subtitle: '',
					logo: '',
					sponsorFlavor: '',
					accentColor: ''
				},
				tokens: {
					'theme.colors.ctFill': '',
					'theme.colors.ctBorder': '',
					'theme.colors.ctText': '',
					'theme.colors.tFill': '',
					'theme.colors.tBorder': '',
					'theme.colors.tText': '',
					'theme.colors.red': '',
					'theme.colors.green': '',
					'theme.materials.panelFill': '',
					'theme.materials.panelBorder': '',
					'theme.shapes.radius': '',
					'theme.shapes.skewAngle': '',
					'theme.shapes.skewComplement': '',
					'theme.typography.primaryFont': '',
					'theme.typography.customFontUrl': ''
				}
			},
			activeTab: 'branding',
			tabs: [
				{ id: 'branding', label: 'Branding' },
				{ id: 'colors', label: 'Colors' },
				{ id: 'shapes', label: 'Shapes' },
				{ id: 'materials', label: 'Materials' },
				{ id: 'typography', label: 'Typography' }
			],
			// Slider states
			radiusVal: 0,
			skewVal: 20,
			fillOpacity: 0.95,
			borderOpacity: 0.12
		}
	},
	computed: {
		mockupStyles() {
			const tokens = this.activeTheme.tokens || {}
			const event = this.activeTheme.event || {}
			
			const ct = tokens['theme.colors.ctFill'] || '25, 106, 232'
			const t = tokens['theme.colors.tFill'] || '232, 137, 22'
			const ctText = tokens['theme.colors.ctText'] || '255, 255, 255'
			const tText = tokens['theme.colors.tText'] || '255, 255, 255'
			
			const bg = tokens['theme.materials.panelFill'] || 'rgba(13, 17, 23, 0.95)'
			const border = tokens['theme.materials.panelBorder'] || 'rgba(255, 255, 255, 0.12)'
			const radius = tokens['theme.shapes.radius'] || '0px'
			const skew = tokens['theme.shapes.skewAngle'] || '20deg'
			
			return {
				'--ct-fill': `rgb(${ct})`,
				'--ct-text-color': `rgb(${ctText})`,
				'--t-fill': `rgb(${t})`,
				'--t-text-color': `rgb(${tText})`,
				'--panel-bg': bg,
				'--panel-border': border,
				'--panel-radius': radius,
				'--panel-skew': skew,
				'--accent-color': event.accentColor || '#3498db',
				'--primary-font': tokens['theme.typography.primaryFont'] || 'Quantico'
			}
		}
	},
	methods: {
		rgbToHex(rgbStr) {
			if (!rgbStr) return '#000000'
			const parts = rgbStr.split(',').map(p => parseInt(p.trim(), 10))
			if (parts.length < 3 || parts.some(isNaN)) return '#000000'
			const r = Math.max(0, Math.min(255, parts[0]))
			const g = Math.max(0, Math.min(255, parts[1]))
			const b = Math.max(0, Math.min(255, parts[2]))
			return '#' + [r, g, b].map(x => {
				const hex = x.toString(16)
				return hex.length === 1 ? '0' + hex : hex
			}).join('')
		},
		hexToRgb(hex) {
			if (!hex) return '0, 0, 0'
			let c = hex.replace(/^#/, '')
			if (c.length === 3) {
				c = c.split('').map(x => x + x).join('')
			}
			if (c.length !== 6) return '0, 0, 0'
			const num = parseInt(c, 16)
			const r = (num >> 16) & 255
			const g = (num >> 8) & 255
			const b = num & 255
			return `${r}, ${g}, ${b}`
		},
		updateColorToken(tokenKey, hexValue) {
			this.activeTheme.tokens[tokenKey] = this.hexToRgb(hexValue)
		},
		updateRadiusToken() {
			this.activeTheme.tokens['theme.shapes.radius'] = `${this.radiusVal}px`
		},
		updateSkewToken() {
			const s = parseInt(this.skewVal, 10)
			this.activeTheme.tokens['theme.shapes.skewAngle'] = `${s}deg`
			this.activeTheme.tokens['theme.shapes.skewComplement'] = `${180 - s}deg`
		},
		updateFillOpacityToken() {
			this.activeTheme.tokens['theme.materials.panelFill'] = `rgba(13, 17, 23, ${this.fillOpacity})`
		},
		updateBorderOpacityToken() {
			this.activeTheme.tokens['theme.materials.panelBorder'] = `rgba(255, 255, 255, ${this.borderOpacity})`
		},
		loadSlidersFromTokens() {
			const tokens = this.activeTheme.tokens
			
			// Radius
			const rMatch = String(tokens['theme.shapes.radius'] || '').match(/^(\d+)/)
			this.radiusVal = rMatch ? parseInt(rMatch[1], 10) : 0
			
			// Skew
			const sMatch = String(tokens['theme.shapes.skewAngle'] || '').match(/^(-?\d+)/)
			this.skewVal = sMatch ? parseInt(sMatch[1], 10) : 20
			
			// Fill Opacity
			const fMatch = String(tokens['theme.materials.panelFill'] || '').match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d\.]+)\s*\)/)
			this.fillOpacity = fMatch ? parseFloat(fMatch[1]) : 0.95
			
			// Border Opacity
			const bMatch = String(tokens['theme.materials.panelBorder'] || '').match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d\.]+)\s*\)/)
			this.borderOpacity = bMatch ? parseFloat(bMatch[1]) : 0.12
		},
		async fetchThemes() {
			try {
				const res = await fetch('/config/event-themes')
				if (res.ok) {
					const all = await res.json()
					this.presets = all.filter(t => !t.isCustom)
					this.customThemes = all.filter(t => t.isCustom)
					
					// Auto load first theme if nothing active
					if (!this.activeTheme.id && all.length > 0) {
						this.loadTheme(all[0])
					}
				}
			} catch (err) {
				console.warn('Failed to load event themes:', err)
			}
		},
		loadTheme(theme) {
			this.activeTheme = JSON.parse(JSON.stringify(theme))
			this.loadSlidersFromTokens()
		},
		clearForNew() {
			this.activeTheme = {
				id: '',
				name: 'My Custom Theme',
				description: 'Custom operator visual branding',
				isCustom: true,
				event: {
					name: 'My Event Name',
					subtitle: 'Live Broadcast',
					logo: '/hud/img/branding/logo-ubg.png',
					sponsorFlavor: 'Eon Partner',
					accentColor: '#3498db'
				},
				tokens: {
					'theme.colors.ctFill': '25, 106, 232',
					'theme.colors.ctBorder': '91, 166, 255',
					'theme.colors.ctText': '156, 204, 255',
					'theme.colors.tFill': '232, 137, 22',
					'theme.colors.tBorder': '255, 181, 71',
					'theme.colors.tText': '255, 214, 138',
					'theme.colors.red': '240, 49, 37',
					'theme.colors.green': '56, 148, 107',
					'theme.materials.panelFill': 'rgba(13, 17, 23, 0.95)',
					'theme.materials.panelBorder': 'rgba(255, 255, 255, 0.12)',
					'theme.shapes.radius': '4px',
					'theme.shapes.skewAngle': '20deg',
					'theme.shapes.skewComplement': '160deg',
					'theme.typography.primaryFont': 'Quantico',
					'theme.typography.customFontUrl': ''
				}
			}
			this.loadSlidersFromTokens()
		},
		duplicateTheme() {
			const clone = JSON.parse(JSON.stringify(this.activeTheme))
			clone.id = '' // reset to force create
			clone.name = `${clone.name} (Copy)`
			clone.isCustom = true
			this.activeTheme = clone
			actions.addAlert('Theme duplicated in memory. Click "Save Theme" to persist.', 'success')
		},
		async saveTheme() {
			// Client-side validations
			const t = this.activeTheme.tokens
			const fontUrl = String(t['theme.typography.customFontUrl'] || '').trim()
			if (fontUrl && (fontUrl.includes('://') || /^(https?:)?\/\//i.test(fontUrl) || !fontUrl.startsWith('/hud/'))) {
				actions.addAlert('Font validation failed: Only local offline-safe font URLs starting with "/hud/" are allowed.', 'error')
				return
			}
			
			const rgbRegex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d),\s*(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d),\s*(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)$/
			for (const [key, val] of Object.entries(t)) {
				if (key.startsWith('theme.colors.') && !key.endsWith('Background') && key !== 'theme.colors.accentColor') {
					if (!rgbRegex.test(String(val).trim())) {
						actions.addAlert(`Color format error: "${key}" must be valid RGB "R, G, B".`, 'error')
						return
					}
				}
			}
			
			this.loading = true
			try {
				const isNew = !this.activeTheme.id || !this.activeTheme.isCustom
				const slug = isNew 
					? this.activeTheme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6)
					: this.activeTheme.id
					
				const url = isNew ? '/config/event-themes' : `/config/event-themes/${slug}`
				const method = isNew ? 'POST' : 'PUT'
				
				const payload = {
					...this.activeTheme,
					id: slug
				}
				
				const res = await fetch(url, {
					method,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				})
				
				const data = await res.json()
				if (!res.ok) throw new Error(data.message || 'Failed to save theme.')
				
				actions.addAlert(`Theme "${data.name}" saved successfully.`, 'success')
				await this.fetchThemes()
				// Auto-select the saved theme
				const matched = this.customThemes.find(x => x.id === data.id)
				if (matched) this.loadTheme(matched)
			} catch (err) {
				actions.addAlert('Save Error: ' + err.message, 'error')
			} finally {
				this.loading = false
			}
		},
		async deleteTheme() {
			if (!confirm(`Are you sure you want to delete the custom theme "${this.activeTheme.name}"?`)) return
			this.loading = true
			try {
				const res = await fetch(`/config/event-themes/${this.activeTheme.id}`, { method: 'DELETE' })
				if (!res.ok) throw new Error('Deletion failed')
				actions.addAlert('Theme deleted successfully.', 'success')
				this.activeTheme.id = ''
				await this.fetchThemes()
			} catch (err) {
				actions.addAlert('Delete Error: ' + err.message, 'error')
			} finally {
				this.loading = false
			}
		},
		async applyTheme() {
			this.loading = true
			try {
				const res = await fetch(`/config/event-themes/${this.activeTheme.id}/apply`, { method: 'POST' })
				const data = await res.json()
				if (!res.ok) throw new Error(data.message || 'Apply failed')
				actions.addAlert(`Theme "${this.activeTheme.name}" applied and HUD overlays refreshed!`, 'success')
			} catch (err) {
				actions.addAlert('Apply Error: ' + err.message, 'error')
			} finally {
				this.loading = false
			}
		}
	},
	mounted() {
		this.fetchThemes()
	}
}
</script>

<style scoped>
.theme-designer {
	max-width: 1400px;
	margin: 0 auto;
}

.designer-grid {
	display: grid;
	grid-template-columns: 360px 1fr;
	gap: 24px;
}

@media (max-width: 1024px) {
	.designer-grid {
		grid-template-columns: 1fr;
	}
}

.card {
	background: #1a1d23;
	border: 1px solid #2d333b;
	border-radius: 12px;
	padding: 24px;
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	border-bottom: 1px solid #2d333b;
	padding-bottom: 12px;
}

.card-header h3 {
	font-size: 1.05rem;
	font-weight: 600;
	color: #fff;
	margin: 0;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.section-desc {
	font-size: 0.8rem;
	color: #8b949e;
	margin: 0 0 16px 0;
	line-height: 1.4;
}

.themes-list {
	max-height: 400px;
	overflow-y: auto;
	margin-bottom: 20px;
	padding-right: 4px;
}

.group-title {
	font-size: 0.75rem;
	text-transform: uppercase;
	color: #8b949e;
	font-weight: 600;
	letter-spacing: 0.05em;
	margin-bottom: 8px;
}

.theme-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 6px;
	padding: 10px 12px;
	margin-bottom: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.theme-item:hover {
	border-color: #58a6ff;
	background: #161b22;
}

.theme-item.--active {
	border-color: #1f6feb;
	background: rgba(31, 111, 235, 0.1);
	box-shadow: 0 0 8px rgba(31, 111, 235, 0.2);
}

.theme-item-meta {
	display: flex;
	flex-direction: column;
	gap: 2px;
	max-width: 70%;
}

.theme-item-meta strong {
	font-size: 0.85rem;
}

.theme-item-meta span {
	font-size: 0.7rem;
	color: #8b949e;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.badge {
	font-size: 0.65rem;
	padding: 2px 6px;
	border-radius: 4px;
	font-weight: 600;
	text-transform: uppercase;
}

.badge.--preset {
	background: rgba(139, 148, 158, 0.12);
	color: #8b949e;
}

.badge.--custom {
	background: rgba(88, 166, 255, 0.15);
	color: #58a6ff;
}

.empty-list-notice {
	text-align: center;
	padding: 16px;
	background: #0d1117;
	border: 1px dashed #30363d;
	color: #8b949e;
	font-size: 0.75rem;
	border-radius: 6px;
}

.designer-actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
	border-top: 1px dashed #2d333b;
	padding-top: 16px;
}

/* Tab controls */
.editor-tabs {
	display: flex;
	gap: 4px;
	border-bottom: 1px solid #2d333b;
	margin-bottom: 20px;
	overflow-x: auto;
}

.tab-button {
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	padding: 10px 16px;
	color: #8b949e;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	white-space: nowrap;
	transition: all 0.2s ease;
}

.tab-button:hover {
	color: #fff;
}

.tab-button.--active {
	color: #fff;
	border-bottom-color: #1f6feb;
}

/* Editor forms */
.editor-section h4 {
	margin: 0 0 16px 0;
	font-size: 0.95rem;
	font-weight: 600;
	color: #adbac7;
}

.form-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.form-group label {
	font-size: 0.75rem;
	color: #8b949e;
	text-transform: uppercase;
	font-weight: 600;
}

.text-input {
	width: 100%;
	box-sizing: border-box;
	padding: 10px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 6px;
	color: #c9d1d9;
	font: inherit;
	font-size: 0.85rem;
}

.text-input:focus {
	outline: none;
	border-color: #58a6ff;
}

.field-desc {
	font-size: 0.75rem;
	color: #8b949e;
	margin: -10px 0 16px 0;
	line-height: 1.4;
}

/* Colors section */
.color-row {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 16px;
}

.color-picker-wrapper {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.color-picker-wrapper label {
	font-size: 0.75rem;
	color: #8b949e;
	font-weight: 600;
	text-transform: uppercase;
}

.picker-controls {
	display: flex;
	gap: 8px;
	align-items: center;
}

.picker-controls input[type="color"] {
	border: 1px solid #30363d;
	background: none;
	width: 38px;
	height: 38px;
	padding: 0;
	border-radius: 6px;
	cursor: pointer;
	flex: 0 0 38px;
}

.picker-controls input[type="color"]::-webkit-color-swatch-wrapper {
	padding: 0;
}
.picker-controls input[type="color"]::-webkit-color-swatch {
	border: none;
	border-radius: 5px;
}

.text-input.--color-text {
	text-align: center;
	font-family: monospace;
	font-size: 0.75rem;
}

/* Sliders */
.slider-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
	background: #0d1117;
	border: 1px solid #30363d;
	border-radius: 8px;
	padding: 16px;
}

.slider-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.slider-header label {
	font-size: 0.8rem;
	font-weight: 600;
	color: #adbac7;
}

.value-readout {
	font-size: 0.8rem;
	font-family: monospace;
	color: #58a6ff;
	font-weight: bold;
	background: rgba(88, 166, 255, 0.1);
	padding: 2px 6px;
	border-radius: 4px;
}

.designer-slider {
	-webkit-appearance: none;
	width: 100%;
	height: 6px;
	border-radius: 3px;
	background: #30363d;
	outline: none;
	margin: 12px 0;
}

.designer-slider::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: #1f6feb;
	cursor: pointer;
	transition: background 0.15s ease;
}

.designer-slider::-webkit-slider-thumb:hover {
	background: #388bfd;
}

.slider-desc {
	margin: 0;
	font-size: 0.75rem;
	color: #8b949e;
}

/* Mockup HUD Preview styling */
.hud-mockup {
	background: rgba(0, 0, 0, 0.4);
	border: 1px solid #2d333b;
	border-radius: 8px;
	aspect-ratio: 16 / 3.5;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	overflow: hidden;
	position: relative;
	font-family: var(--primary-font), 'Quantico', sans-serif;
}

.hud-bar {
	width: 100%;
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	gap: 16px;
}

.hud-brand-container {
	display: flex;
	align-items: center;
	gap: 10px;
	background: var(--panel-bg);
	border: 1px solid var(--panel-border);
	border-radius: var(--panel-radius);
	transform: skewX(var(--panel-skew));
	padding: 8px 16px;
}

.hud-logo {
	height: 28px;
	transform: skewX(calc(-1 * var(--panel-skew)));
}

.hud-event-copy {
	display: flex;
	flex-direction: column;
	gap: 2px;
	transform: skewX(calc(-1 * var(--panel-skew)));
}

.hud-event-name {
	font-size: 0.8rem;
	font-weight: 700;
	color: #fff;
	letter-spacing: 0.02em;
}

.hud-event-subtitle {
	font-size: 0.6rem;
	color: #8b949e;
	text-transform: uppercase;
}

.hud-teams-container {
	display: flex;
	align-items: center;
	background: var(--panel-bg);
	border: 1px solid var(--panel-border);
	border-radius: var(--panel-radius);
	transform: skewX(var(--panel-skew));
	overflow: hidden;
}

.hud-team {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 16px;
	font-weight: 700;
	font-size: 0.85rem;
}

.hud-team-ct {
	background: var(--ct-fill);
	color: var(--ct-text-color);
}

.hud-team-t {
	background: var(--t-fill);
	color: var(--t-text-color);
}

.hud-team-name {
	transform: skewX(calc(-1 * var(--panel-skew)));
}

.hud-score {
	font-size: 1.15rem;
	font-weight: bold;
	transform: skewX(calc(-1 * var(--panel-skew)));
}

.hud-clock-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 0 16px;
	transform: skewX(calc(-1 * var(--panel-skew)));
	color: #fff;
}

.hud-clock {
	font-size: 1.1rem;
	font-weight: bold;
}

.hud-round-count {
	font-size: 0.6rem;
	color: #8b949e;
	text-transform: uppercase;
}

.hud-sponsor-tag {
	justify-self: flex-end;
	background: var(--panel-bg);
	border: 1px solid var(--panel-border);
	border-left: 4px solid var(--accent-color);
	border-radius: var(--panel-radius);
	transform: skewX(var(--panel-skew));
	padding: 8px 16px;
	font-size: 0.75rem;
	font-weight: 600;
	color: #fff;
}

.hud-sponsor-tag span {
	display: block;
	transform: skewX(calc(-1 * var(--panel-skew)));
}

/* Button styles matching global theme */
.btn-primary {
	background: #1f6feb;
	color: #fff;
	border: 1px solid transparent;
	padding: 10px;
	border-radius: 6px;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s ease;
}
.btn-primary:hover:not(:disabled) {
	background: #388bfd;
}
.btn-primary:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-promo {
	background: #2d333b;
	border: 1px solid #3498db;
	color: #3498db;
	padding: 10px;
	border-radius: 6px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s ease;
}
.btn-promo:hover:not(:disabled) {
	background: #3498db;
	color: #fff;
}
.btn-promo:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-win {
	border: 1px solid #30363d;
	border-radius: 6px;
	font-weight: 600;
	cursor: pointer;
	background: #2d333b;
	color: #adbac7;
	transition: all 0.2s;
}
.btn-win:hover:not(:disabled) {
	background: #3e444d;
	color: #fff;
}
.btn-win.--clear {
	background: #2d333b;
	border-color: #30363d;
}
.btn-win.--hidden {
	background: rgba(231, 76, 60, 0.1);
	border-color: rgba(231, 76, 60, 0.2);
	color: #ea6060;
}
.btn-win.--hidden:hover:not(:disabled) {
	background: #e74c3c;
	color: #fff;
	border-color: transparent;
}
.btn-win:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-ghost {
	background: none;
	border: 1px solid #2d333b;
	color: #8b949e;
	border-radius: 4px;
	cursor: pointer;
}
.btn-ghost:hover {
	color: #fff;
	border-color: #444;
}
</style>
