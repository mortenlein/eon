export default {
	computed: {
		match() {
			return this.$root.komplettligaenMatch
		},
		maps() {
			return this.match?.maps || []
		}
	},
	methods: {
		isCurrent(map) {
			if (!this.match?.currentMap) return false
			return this.match.currentMap.name === map.name
		}
	}
}
