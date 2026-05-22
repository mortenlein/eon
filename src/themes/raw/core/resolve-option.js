import { options } from '/hud/core/state.js'

export const LEGACY_OPTION_ALIASES = {
	'layout.radar.top': ['css.lan66-radar-top'],
	'layout.radar.left': ['css.lan66-radar-left'],
	'layout.radar.width': ['css.radar-width'],
	'layout.radar.visible': ['css.lan66-radar-display'],

	'layout.topbar.top': ['css.lan66-top-bar-top'],
	'layout.topbar.visible': ['css.lan66-top-bar-display'],

	'layout.sidebar.left': ['css.lan66-sidebar-left'],
	'layout.sidebar.right': ['css.lan66-sidebar-right'],
	'layout.sidebar.bottom': ['css.lan66-sidebar-bottom'],
	'layout.sidebar.leftVisible': ['css.lan66-sidebar-left-display'],
	'layout.sidebar.rightVisible': ['css.lan66-sidebar-right-display'],

	'layout.playersAlive.top': ['css.lan66-players-alive-top'],
	'layout.playersAlive.right': ['css.lan66-players-alive-right'],
	'layout.playersAlive.visible': ['css.lan66-players-alive-display'],

	'layout.focusedPlayer.bottom': ['css.lan66-focused-player-bottom'],
	'layout.focusedPlayer.visible': ['css.lan66-focused-player-display']
}

export const RADAR_OPTION_DEFINITIONS = [
	{
		canonical: 'layout.radar.top',
		aliases: ['css.lan66-radar-top'],
		cssVars: ['--lan66-radar-top', '--layout-radar-top'],
		fallback: '1.5rem'
	},
	{
		canonical: 'layout.radar.left',
		aliases: ['css.lan66-radar-left'],
		cssVars: ['--lan66-radar-left', '--layout-radar-left'],
		fallback: '2.5rem'
	},
	{
		canonical: 'layout.radar.width',
		aliases: ['css.radar-width'],
		cssVars: ['--radar-width', '--layout-radar-width'],
		fallback: '21%'
	},
	{
		canonical: 'layout.radar.visible',
		aliases: ['css.lan66-radar-display'],
		cssVars: ['--lan66-radar-display', '--layout-radar-display'],
		fallback: 'flex'
	}
]

export const TOPBAR_OPTION_DEFINITIONS = [
	{
		canonical: 'layout.topbar.top',
		aliases: ['css.lan66-top-bar-top'],
		cssVars: ['--lan66-top-bar-top', '--layout-topbar-top'],
		fallback: 'var(--viewport-margin-top)'
	},
	{
		canonical: 'layout.topbar.visible',
		aliases: ['css.lan66-top-bar-display'],
		cssVars: ['--lan66-top-bar-display', '--layout-topbar-display'],
		fallback: 'flex'
	}
]

export const SIDEBAR_POSITION_OPTION_DEFINITIONS = [
	{
		canonical: 'layout.sidebar.left',
		aliases: ['css.lan66-sidebar-left'],
		cssVars: ['--lan66-sidebar-left', '--layout-sidebar-left'],
		fallback: 'var(--viewport-margin-left)'
	},
	{
		canonical: 'layout.sidebar.right',
		aliases: ['css.lan66-sidebar-right'],
		cssVars: ['--lan66-sidebar-right', '--layout-sidebar-right'],
		fallback: 'var(--viewport-margin-right)'
	},
	{
		canonical: 'layout.sidebar.bottom',
		aliases: ['css.lan66-sidebar-bottom'],
		cssVars: ['--lan66-sidebar-bottom', '--layout-sidebar-bottom'],
		fallback: 'var(--viewport-margin-bottom)'
	}
]

export const SIDEBAR_VISIBILITY_OPTION_DEFINITIONS = [
	{
		canonical: 'layout.sidebar.leftVisible',
		aliases: ['css.lan66-sidebar-left-display'],
		cssVars: ['--lan66-sidebar-left-display', '--layout-sidebar-left-display'],
		fallback: 'flex'
	},
	{
		canonical: 'layout.sidebar.rightVisible',
		aliases: ['css.lan66-sidebar-right-display'],
		cssVars: ['--lan66-sidebar-right-display', '--layout-sidebar-right-display'],
		fallback: 'flex'
	}
]

export const PLAYERS_ALIVE_OPTION_DEFINITIONS = [
	{
		canonical: 'layout.playersAlive.top',
		aliases: ['css.lan66-players-alive-top'],
		cssVars: ['--lan66-players-alive-top', '--layout-players-alive-top'],
		fallback: 'var(--viewport-margin-top)'
	},
	{
		canonical: 'layout.playersAlive.right',
		aliases: ['css.lan66-players-alive-right'],
		cssVars: ['--lan66-players-alive-right', '--layout-players-alive-right'],
		fallback: 'var(--viewport-margin-right)'
	},
	{
		canonical: 'layout.playersAlive.visible',
		aliases: ['css.lan66-players-alive-display'],
		cssVars: ['--lan66-players-alive-display', '--layout-players-alive-display'],
		fallback: 'flex'
	}
]

export const FOCUSED_PLAYER_OPTION_DEFINITIONS = [
	{
		canonical: 'layout.focusedPlayer.bottom',
		aliases: ['css.lan66-focused-player-bottom'],
		cssVars: ['--lan66-focused-player-bottom', '--layout-focused-player-bottom'],
		fallback: 'var(--viewport-margin-bottom)'
	},
	{
		canonical: 'layout.focusedPlayer.visible',
		aliases: ['css.lan66-focused-player-display'],
		cssVars: ['--lan66-focused-player-display', '--layout-focused-player-display'],
		fallback: 'flex'
	}
]


/**
 * Resolves an option from the unified store, falling back to legacy aliases or default.
 * @param {string} canonicalKey - The canonical key path
 * @param {any} fallback - The absolute default fallback value
 * @returns {any} Option value
 */
export function resolveOption(canonicalKey, fallback = null) {
	// 1. Check canonical key
	if (options[canonicalKey] !== undefined && options[canonicalKey] !== null) {
		return options[canonicalKey]
	}

	// 2. Check legacy aliases in order
	const aliases = LEGACY_OPTION_ALIASES[canonicalKey] || []
	for (const alias of aliases) {
		if (options[alias] !== undefined && options[alias] !== null) {
			return options[alias]
		}
	}

	// 3. Fallback to default
	return fallback
}

/**
 * Wraps resolveOption for CSS-specific processing.
 */
export function resolveCssOption(canonicalKey, fallback = null) {
	return resolveOption(canonicalKey, fallback)
}

/**
 * Returns all canonical keys and legacy aliases from definitions flattened into a single array.
 * @param {Array} definitions - The option definitions list
 * @returns {string[]} Flattened array of migrated option keys
 */
export function getMigratedOptionKeys(definitions) {
	const keys = []
	definitions.forEach(def => {
		if (def.canonical) {
			keys.push(def.canonical)
		}
		if (def.aliases) {
			keys.push(...def.aliases)
		}
	})
	return keys
}

/**
 * Applies a list of option definitions as CSS variables on document.documentElement.
 * @param {Array} definitions - The array of definitions to apply
 */
export function applyResolvedCssVariables(definitions) {
	definitions.forEach(def => {
		const val = resolveCssOption(def.canonical, def.fallback)
		if (val === undefined || val === null) return

		if (def.cssVars) {
			def.cssVars.forEach(v => {
				if (val === '') {
					document.documentElement.style.removeProperty(v)
				} else {
					document.documentElement.style.setProperty(v, val)
				}
			})
		}
	})
}
