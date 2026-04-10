const normalizeAssetUrl = (value) => {
	if (! value?.trim()) return ''

	const trimmed = value.trim()
	if (
		trimmed.startsWith('/')
		|| trimmed.startsWith('http://')
		|| trimmed.startsWith('https://')
		|| trimmed.startsWith('data:')
	) return trimmed

	return `/hud/${trimmed.replace(/^\.?\//, '')}`
}

export default {
	computed: {
		sponsorSlots() {
			return ['left', 'right']
				.map((position) => ({
					position,
					href: this.$opts[`sponsors.${position}.href`]?.trim() || '',
					imageUrl: normalizeAssetUrl(this.$opts[`sponsors.${position}.imageUrl`]),
					title: this.$opts[`sponsors.${position}.title`]?.trim() || '',
				}))
				.filter((slot) => slot.imageUrl || slot.title)
		},

		hasSponsors() {
			return this.sponsorSlots.length > 0
		},
	},
}
