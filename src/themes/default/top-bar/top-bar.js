import CurrentRound from '/hud/top-bar/center/current-round/current-round.vue'
import MatchPointRounds from '/hud/top-bar/center/match-point-rounds/match-point-rounds.vue'
import SeriesName from '/hud/top-bar/series-name/series-name.vue'
import { teamColorClass } from '/hud/helpers/team-color-class.js'

export default {
	props: ['match'],

	components: {
		CurrentRound,
		MatchPointRounds,
		SeriesName,
	},

	methods: {
		teamColorClass,

		getTeamName(teamIndex) {
			const team = this.$teams[teamIndex];
			if (!team) return '';

			// 1. Manual override in config takes priority
			const override = teamIndex === 0 ? this.$opts['teams.leftTeamName'] : this.$opts['teams.rightTeamName'];
			if (override?.trim()) return override;

			const match = this.match;
			if (match) {
				const isSwapped = this.$opts['preferences.topBar.swapScrapedTeams'];
				const homeName = match.home?.name;
				const awayName = match.away?.name;

				// Try to match by current GSI name (handles side swaps automatically if names match)
				if (team.name === homeName) return homeName;
				if (team.name === awayName) return awayName;

				// Fallback to index-based assignment if no name match (e.g. demo mode or name mismatch)
				if (teamIndex === 0) return isSwapped ? awayName : homeName;
				if (teamIndex === 1) return isSwapped ? homeName : awayName;
			}

			return team.name || '';
		},

		getTeamLogo(teamIndex) {
			const team = this.$teams[teamIndex];
			const match = this.match;
			if (!team || !match) return null;

			const isSwapped = this.$opts['preferences.topBar.swapScrapedTeams'];
			const homeName = match.home?.name;
			const awayName = match.away?.name;
			const homeLogo = match.home?.logo;
			const awayLogo = match.away?.logo;

			// Try to match by current name
			if (team.name === homeName) return homeLogo;
			if (team.name === awayName) return awayLogo;

			// Fallback to index-based if no name match
			if (teamIndex === 0) return isSwapped ? awayLogo : homeLogo;
			if (teamIndex === 1) return isSwapped ? homeLogo : awayLogo;

			return null;
		}
	},
}


