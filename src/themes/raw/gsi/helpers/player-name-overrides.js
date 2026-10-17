import { additionalState, options } from '/hud/core/state.js'
import { getPlayerDisplayName } from '/hud/helpers/player-resolver.js'

// The operator's manual lines first, Summit's (additionalState.summitNames) after -
// the first matching line wins, so manual entries always beat Summit.
export const getPlayerNameOverridesText = () => [
	options['teams.playerNameOverrides'],
	additionalState.summitNames?.playerNameOverrides,
].filter((text) => text?.trim()).join('\n')

export const getPlayerNameOverrides = () => {
	const playerNameOverrides = new Map()

	const opt = getPlayerNameOverridesText()
	if (! opt?.trim()?.length) return playerNameOverrides

	const lines = opt.trim().split('\n')

	for (const line of lines) {
		const segments = line.trim().split(/\s+/)
		if (
			segments.length < 2
			|| ! /^\d+$/.test(segments[0])
			|| ! segments[0].startsWith('7656')
			|| ! segments[1]
		) continue

		const steamId = segments[0]
		const overriddenName = getPlayerDisplayName(steamId, '', opt)
		if (overriddenName) {
			playerNameOverrides.set(steamId, overriddenName)
		}
	}

	return playerNameOverrides
}
