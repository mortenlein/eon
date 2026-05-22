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
