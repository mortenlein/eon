import Update from '/config/options/update/update.vue'

export default {
	components: {
		Update,
	},

	data() {
		return {
			initialTheme: null,
			initialOptionValuesSnapshot: '{}',
			optionValues: {},
			saveState: 'idle',
			sections: [],
		}
	},

	computed: {
		hasUnsavedChanges() {
			return this.createOptionValuesSnapshot(this.optionValues) !== this.initialOptionValuesSnapshot
		},
	},

	mounted() {
		document.addEventListener('keydown', this.onKeydown)
		this.initOptions()
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown)
	},

	methods: {
		async initOptions() {
			const res = await fetch('/config/options')
			const json = await res.json()

			const optionValues = {}
			const sections = {}

			for (const option of json) {
				if (! sections[option.section]) {
					sections[option.section] = {
						description: option.sectionDescription,
						id: this.getSectionId(option.section),
						name: option.section,
						options: [],
					}
				}

				optionValues[option.key] = option.value

				sections[option.section].options.push({
					...option,
					inputType: this.getInputType(option.type),
					keySegments: option.key.split('.'),
				})

				if (sections[option.section].description) {
					sections[option.section].description = option.sectionDescription
				}
			}

			this.initialTheme = optionValues.theme
			this.optionValues = optionValues
			this.initialOptionValuesSnapshot = this.createOptionValuesSnapshot(optionValues)
			this.sections = Object.values(sections)
		},

		createOptionValuesSnapshot(optionValues) {
			return JSON.stringify(optionValues)
		},

		getInputType(type) {
			switch (type) {
				case 'boolean': return 'checkbox'
				case 'color': return 'color'
				case 'number': return 'number'
				case 'text': return 'textarea'
				default: return 'text'
			}
		},

		getSectionId(sectionName) {
			return `section-${sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
		},

		onKeydown(e) {
			// on Ctrl+S, save changes
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

		async save() {
			this.saveState = 'saving'

			try {
				await fetch('/config/options', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(this.optionValues),
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
	},
}
