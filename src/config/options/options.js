
export default {
	components: {},

	data() {
		return {
			initialTheme: null,
			initialOptionValuesSnapshot: '{}',
			optionValues: {},
			saveState: 'idle',
			sections: [],
			socket: null,
			configLoaded: false,
			showAdvancedSettings: false,
			activeCategory: 'dashboard',
			activeMatchIndex: 0,
			drawingColor: '#ff5a00',
			drawingSize: 5,
			isDrawing: false,
			lastX: 0,
			lastY: 0,
			categories: [
				{ id: 'dashboard', label: 'Live Control', icon: '🔴' },
				{ id: 'rules', label: 'Match Rules', icon: '📝' },
				{ id: 'setup', label: 'Match Setup', icon: '🎮' },
				{ id: 'advanced', label: 'System', icon: '⚙️' }
			],
			drawingColors: [
				'#ff5a00', '#3498db', '#2ecc71', '#f1c40f', '#ffffff', '#e74c3c',
				'#9b59b6', '#ff79c6', '#aaff00', '#00ffff', '#2c3e50', '#000000'
			],
			drawingSizes: [
				{ label: 'Thin', value: 2 },
				{ label: 'Medium', value: 5 },
				{ label: 'Thick', value: 10 },
				{ label: 'Marker', value: 20 }
			]
		}
	},

	computed: {
		hasUnsavedChanges() {
			return this.createOptionValuesSnapshot(this.optionValues) !== this.initialOptionValuesSnapshot
		},

		filteredSections() {
			if (! this.sections) return []

			const mapping = {
				'Match Rules': 'rules',
				'Teams': 'setup',
				'Series': 'setup',
				'Sponsors': 'branding',
				'Promotion': 'branding',
			}

			let sections = this.sections.map(s => {
				const categoryKey = Object.keys(mapping).find(m => s.name === m || (s.name && s.name.startsWith(m + ':')))
				return { ...s, category: categoryKey ? mapping[categoryKey] : 'advanced' }
			})

			if (this.activeCategory === 'setup') {
				sections = sections.filter(s => {
					const matchMatch = s.name && s.name.match(/Match (\d+)/i)
					if (matchMatch) {
						return parseInt(matchMatch[1]) === (this.activeMatchIndex + 1)
					}
					return true
				})
			}

			return sections.filter(s => s.category === this.activeCategory)
		},
	},

	watch: {
		activeCategory(newCat) {
			try { localStorage.setItem('eon-config-category', newCat) } catch (e) {}
		},
		showAdvancedSettings(val) {
			try { localStorage.setItem('eon-config-advanced', val) } catch (e) {}
		}
	},

	mounted() {
		try {
			this.activeCategory = localStorage.getItem('eon-config-category') || 'dashboard'
			this.showAdvancedSettings = localStorage.getItem('eon-config-advanced') === 'true'
		} catch (e) {}

		document.addEventListener('keydown', this.onKeydown)
		this.initOptions()
		this.initWebsocket()
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown)
		if (this.socket) this.socket.close()
	},

	methods: {
		async initOptions() {
			try {
				const res = await fetch('/config/options')
				const json = await res.json()

				const optionValues = {}
				const sections = {}

				for (const option of json) {
					const sectionName = option.section || 'General'
					if (sectionName === 'HUD Layout' || sectionName === 'Style Overrides' || sectionName === 'General' || sectionName === 'Event' || sectionName === 'Sponsors' || sectionName === 'Theme' || sectionName === 'Promotion') continue

					if (! sections[sectionName]) {
						sections[sectionName] = {
							description: option.sectionDescription,
							id: this.getSectionId(sectionName),
							name: sectionName,
							options: [],
						}
					}

					optionValues[option.key] = option.value

					sections[sectionName].options.push({
						...option,
						inputType: this.getInputType(option.type),
						keySegments: (option.key || '').split('.'),
					})
				}

				this.initialTheme = optionValues.theme
				this.optionValues = optionValues
				this.initialOptionValuesSnapshot = this.createOptionValuesSnapshot(optionValues)
				this.sections = Object.values(sections)
				this.configLoaded = true
			} catch (err) {
				console.error('Failed to load options', err)
			}
		},

		createOptionValuesSnapshot(optionValues) {
			return JSON.stringify(optionValues)
		},

		getInputType(type) {
			switch (type) {
				case 'boolean': return 'checkbox'
				case 'color': return 'color'
				case 'number': return 'number'
				case 'textarea': return 'textarea'
				case 'select': return 'select'
				default: return 'text'
			}
		},

		getSectionId(sectionName) {
			if (! sectionName) return 'section-default'
			return `section-${sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
		},

		onKeydown(e) {
			if (
				e.key.toLowerCase() === 's'
				&& ! e.altKey
				&& e.ctrlKey
				&& ! e.metaKey
				&& ! e.shiftKey
			) {
				e.preventDefault()
				e.stopImmediatePropagation()
				return this.save()
			}
		},

		async save(partialChanges = null) {
			this.saveState = 'saving'

			// Data Isolation: If we're performing a full save, only send keys
			// that this dashboard is actively managing. This prevents stale
			// layout data from overwriting changes made in the Layout Editor.
			let payload = partialChanges
			if (!payload) {
				payload = {}
				// Collect every key that belongs to one of our mapped sections
				const managedKeys = this.sections.flatMap(s => s.options.map(o => o.key))
				managedKeys.forEach(k => {
					if (this.optionValues[k] !== undefined) payload[k] = this.optionValues[k]
				})
				// Always include the theme
				if (this.optionValues.theme) payload.theme = this.optionValues.theme
			}

			try {
				await fetch('/config/options', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})

				this.initialOptionValuesSnapshot = this.createOptionValuesSnapshot(this.optionValues)
				this.saveState = 'saved'

				if (this.optionValues.theme !== this.initialTheme) {
					window.location.reload()
					return
				}

				window.setTimeout(() => {
					if (this.saveState === 'saved') this.saveState = 'idle'
				}, 2500)
			} catch (err) {
				this.saveState = 'error'
				console.error(err)
			}
		},

		async forceHudRefresh() {
			await fetch('/config/force-hud-refresh', { method: 'POST' })
		},

		resetValue(key) {
			this.optionValues[key] = null
		},

		exportConfig() {
			const data = JSON.stringify({
				version: '1.0',
				timestamp: new Date().toISOString(),
				theme: this.optionValues.theme,
				options: this.optionValues,
			}, null, 2)
			const blob = new Blob([data], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `eon-config-${this.optionValues.theme}-${new Date().toISOString().slice(0, 10)}.json`
			a.click()
			URL.revokeObjectURL(url)
		},

		importConfig(e) {
			const file = e.target.files[0]
			if (! file) return

			const reader = new FileReader()
			reader.onload = (event) => {
				try {
					const imported = JSON.parse(event.target.result)
					if (imported.options) {
						this.optionValues = { ...this.optionValues, ...imported.options }
						alert('Configuration imported successfully! Please click SAVE to apply changes.')
					} else {
						this.optionValues = { ...this.optionValues, ...imported }
						alert('Configuration imported. Please click SAVE to apply changes.')
					}
				} catch (err) {
					console.error('Import failed', err)
					alert('Invalid configuration file.')
				}
			}
			reader.readAsText(file)
			e.target.value = ''
		},

		initWebsocket() {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			this.socket = new WebSocket(`${protocol}//${window.location.host}`)

			this.socket.onmessage = (msg) => {
				try {
					const { event, body } = JSON.parse(msg.data)
					if (event === 'config:update' && body.key) {
						// Update local state so we don't overwrite with stale data later
						this.optionValues[body.key] = body.value
					} else if ((event === 'static_data' || event === 'state') && body.options) {
						// Sync full configuration blob (e.g. after layout save)
						Object.assign(this.optionValues, body.options)
					} else if (event === 'draw:line') {
						this.renderRemoteLine(body)
					} else if (event === 'draw:clear') {
						this.clearLocalCanvas()
					}
				} catch (e) {}
			}
		},

		sendDrawEvent(event, body) {
			if (! this.socket || this.socket.readyState !== WebSocket.OPEN) return
			this.socket.send(JSON.stringify({ event, body }))
		},

		setScene(id) {
			this.optionValues['match.activeScene'] = id
			this.sendDrawEvent('config:update', { key: 'match.activeScene', value: id })
			this.save({ 'match.activeScene': id })
		},

		setWinner(id) {
			this.optionValues['preferences.celebration.forceWinner'] = id
			this.sendDrawEvent('config:update', { key: 'preferences.celebration.forceWinner', value: id })
			this.save({ 'preferences.celebration.forceWinner': id })
		},
		
		togglePromotion() {
			const newVal = ! this.optionValues['promotion.visible']
			this.optionValues['promotion.visible'] = newVal
			this.sendDrawEvent('config:update', { key: 'promotion.visible', value: newVal })
			this.save({ 'promotion.visible': newVal })
		},

		startDrawing(e) {
			if (!this.$refs.drawingCanvas) return
			this.isDrawing = true
			const pos = this.getCanvasPos(e)
			this.lastX = pos.x
			this.lastY = pos.y
		},

		draw(e) {
			if (! this.isDrawing || !this.$refs.drawingCanvas) return
			const pos = this.getCanvasPos(e)
			
			this.sendDrawEvent('draw:line', {
				x1: this.lastX,
				y1: this.lastY,
				x2: pos.x,
				y2: pos.y,
				color: this.drawingColor,
				size: this.drawingSize
			})

			if (this.$refs.drawingCanvas) {
				const ctx = this.$refs.drawingCanvas.getContext('2d')
				const rect = this.$refs.drawingCanvas.getBoundingClientRect()
				ctx.beginPath()
				ctx.moveTo(this.lastX * rect.width, this.lastY * rect.height)
				ctx.lineTo(pos.x * rect.width, pos.y * rect.height)
				ctx.strokeStyle = this.drawingColor
				ctx.lineWidth = this.drawingSize
				ctx.lineCap = 'round'
				ctx.stroke()
			}

			this.lastX = pos.x
			this.lastY = pos.y
		},

		stopDrawing() {
			this.isDrawing = false
		},

		clearDrawing() {
			this.clearLocalCanvas()
			this.sendDrawEvent('draw:clear')
		},

		clearLocalCanvas() {
			if (this.$refs.drawingCanvas) {
				const ctx = this.$refs.drawingCanvas.getContext('2d')
				ctx.clearRect(0, 0, this.$refs.drawingCanvas.width, this.$refs.drawingCanvas.height)
			}
		},

		renderRemoteLine(body) {
			const { x1, y1, x2, y2, color, size } = body
			if (this.$refs.drawingCanvas) {
				const ctx = this.$refs.drawingCanvas.getContext('2d')
				const rect = this.$refs.drawingCanvas.getBoundingClientRect()
				ctx.beginPath()
				ctx.moveTo(x1 * rect.width, y1 * rect.height)
				ctx.lineTo(x2 * rect.width, y2 * rect.height)
				ctx.strokeStyle = color
				ctx.lineWidth = size
				ctx.lineCap = 'round'
				ctx.stroke()
			}
		},

		getCanvasPos(e) {
			const canvas = this.$refs.drawingCanvas
			if (!canvas) return { x: 0, y: 0 }
			const rect = canvas.getBoundingClientRect()
			const clientX = e.touches ? e.touches[0].clientX : e.clientX
			const clientY = e.touches ? e.touches[0].clientY : e.clientY
			
			if (canvas.width !== rect.width || canvas.height !== rect.height) {
				canvas.width = rect.width
				canvas.height = rect.height
			}

			return {
				x: (clientX - rect.left) / rect.width,
				y: (clientY - rect.top) / rect.height
			}
		}
	},
}
