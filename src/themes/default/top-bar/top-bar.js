import CurrentRound from '/hud/top-bar/center/current-round/current-round.vue'
import MatchPointRounds from '/hud/top-bar/center/match-point-rounds/match-point-rounds.vue'
import SeriesName from '/hud/top-bar/series-name/series-name.vue'
import { teamColorClass } from '/hud/helpers/team-color-class.js'

export default {
	components: {
		CurrentRound,
		MatchPointRounds,
		SeriesName,
	},

	methods: {
		teamColorClass,
	},
}


