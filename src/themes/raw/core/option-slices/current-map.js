export const CURRENT_MAP_OPTION_DEFINITIONS = [
	{
		canonical: 'layout.currentMap.bottom',
		aliases: ['css.lan66-current-map-bottom'],
		cssVars: ['--lan66-current-map-bottom', '--layout-current-map-bottom'],
		fallback: 'var(--viewport-margin-bottom)'
	},
	{
		canonical: 'layout.currentMap.right',
		aliases: ['css.lan66-current-map-right'],
		cssVars: ['--lan66-current-map-right', '--layout-current-map-right'],
		fallback: 'var(--viewport-margin-right)'
	},
	{
		canonical: 'style.currentMap.width',
		aliases: ['css.lan66-current-map-width'],
		cssVars: ['--lan66-current-map-width', '--style-current-map-width'],
		fallback: '16rem'
	},
	{
		canonical: 'layout.currentMap.visible',
		aliases: ['css.lan66-current-map-display'],
		cssVars: ['--lan66-current-map-display', '--layout-current-map-display'],
		fallback: 'flex'
	}
]
