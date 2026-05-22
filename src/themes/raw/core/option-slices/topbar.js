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
