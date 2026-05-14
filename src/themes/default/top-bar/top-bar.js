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
			const match = this.match;

			// If in demo mode (or just whenever a match is loaded and names mismatch),
			// force the HUD to display the scraped names so the user can verify the integration.
			if (match) {
				if (teamIndex === 0 && match.home?.name) return match.home.name;
				if (teamIndex === 1 && match.away?.name) return match.away.name;
			}

			return team?.name || '';
		},

		getTeamLogo(teamIndex) {
			const team = this.$teams[teamIndex];
			const match = this.match;
			if (!team || !match) return null;

			if (team.name === match.home?.name) return match.home?.logo;
			if (team.name === match.away?.name) return match.away?.logo;

			// Fallback logic if names don't exactly match (e.g., GSI name slightly different than Komplettligaen name)
			// Assume home is left (0) and away is right (1)
			if (teamIndex === 0 && match.home?.logo) return match.home.logo;
			if (teamIndex === 1 && match.away?.logo) return match.away.logo;

			return null;
		}
	},
}


