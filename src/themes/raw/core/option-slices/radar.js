export const RADAR_OPTION_DEFINITIONS = [
	{canonical: 'layout.radar.top',
		aliases: ['css.lan66-radar-top'],
		cssVars: ['--lan66-radar-top', '--layout-radar-top'],
		fallback: '1.5rem',
		lifecycle: {
			introducedIn: 'v1.5.0',
			canonicalSince: 'v1.5.0',
			aliases: {
				'css.lan66-radar-top': {
					status: 'transitional',
					sunsetPhase: 'Phase 3B',
					removeAfter: 'v2.0.0'
				}
			}
		}
	},
	{canonical: 'layout.radar.left',
		aliases: ['css.lan66-radar-left'],
		cssVars: ['--lan66-radar-left', '--layout-radar-left'],
		fallback: '2.5rem',
		lifecycle: {
			introducedIn: 'v1.5.0',
			canonicalSince: 'v1.5.0',
			aliases: {
				'css.lan66-radar-left': {
					status: 'transitional',
					sunsetPhase: 'Phase 3B',
					removeAfter: 'v2.0.0'
				}
			}
		}
	},
	{canonical: 'layout.radar.width',
		aliases: ['css.radar-width'],
		cssVars: ['--radar-width', '--layout-radar-width'],
		fallback: '21%',
		lifecycle: {
			introducedIn: 'v1.5.0',
			canonicalSince: 'v1.5.0',
			aliases: {
				'css.radar-width': {
					status: 'transitional',
					sunsetPhase: 'Phase 3B',
					removeAfter: 'v2.0.0'
				}
			}
		}
	},
	{canonical: 'layout.radar.visible',
		aliases: ['css.lan66-radar-display'],
		cssVars: ['--lan66-radar-display', '--layout-radar-display'],
		fallback: 'flex',
		lifecycle: {
			introducedIn: 'v1.5.0',
			canonicalSince: 'v1.5.0',
			aliases: {
				'css.lan66-radar-display': {
					status: 'transitional',
					sunsetPhase: 'Phase 3B',
					removeAfter: 'v2.0.0'
				}
			}
		}
	}
]
