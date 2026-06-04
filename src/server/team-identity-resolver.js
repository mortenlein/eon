const GENERIC_GSI_NAMES = new Set([
	'terrorist',
	'terrorists',
	'counter-terrorist',
	'counter-terrorists',
	'ct',
	't',
])

const normalize = (value) => String(value || '').trim()

export const isGenericGsiTeamName = (name) => {
	const normalized = normalize(name).toLowerCase()
	return !normalized || GENERIC_GSI_NAMES.has(normalized)
}

const candidate = (source, value, details = {}) => ({
	source,
	value: normalize(value) || null,
	valid: details.valid ?? !!normalize(value),
	reason: details.reason || null,
	meta: details.meta || {},
})

const sideFallbackName = (side) => side === 'CT' ? 'CT' : 'T'

const pickFirstValid = (candidates) => candidates.find((item) => item.valid && item.value) || null

const confidenceForSource = (source) => ({
	override: 'high',
	komplettligaen: 'high',
	'match-session': 'medium',
	gsi: 'medium',
	'filesystem-logo': 'low',
	fallback: 'low',
}[source] || 'low')

export const resolveTeamIdentity = (side, context) => {
	const sideKey = side.toLowerCase()
	const slot = context.slots?.[sideKey] || {}
	const gsiName = slot.gsi?.name || ''
	const kl = slot.komplettligaen || {}
	const session = slot.session || {}
	const fsLogo = slot.filesystemLogo || {}

	const nameCandidates = [
		candidate('override', slot.override?.name, {
			reason: slot.override?.name ? 'Manual operator override for this sidebar slot.' : 'No manual override configured.',
		}),
		candidate('komplettligaen', kl.name, {
			reason: kl.name ? 'GG Arena match identity mapped to the current sidebar slot.' : 'No GG Arena team name available for this slot.',
			meta: { matchId: context.komplettligaen?.config?.matchId || null },
		}),
		candidate('match-session', session.name, {
			reason: session.name ? 'Active match session metadata contains a team name.' : 'No active match session team name available.',
			meta: { sessionId: context.session?.id || null },
		}),
		candidate('gsi', gsiName, {
			valid: !!normalize(gsiName) && !isGenericGsiTeamName(gsiName),
			reason: isGenericGsiTeamName(gsiName)
				? 'GSI name is a generic CS side label and is ignored.'
				: 'Live GSI supplied a non-generic team name.',
		}),
		candidate('fallback', sideFallbackName(side), {
			reason: 'Last-resort side fallback.',
		}),
	]

	const finalName = pickFirstValid(nameCandidates)
	const resolvedName = finalName?.value || sideFallbackName(side)

	const logoCandidates = [
		candidate('override', slot.override?.logo, {
			reason: 'No manual team logo override is currently configured.',
			valid: false,
		}),
		candidate('komplettligaen', kl.logo, {
			reason: kl.logo ? 'GG Arena match identity provides this logo.' : 'No GG Arena logo available for this slot.',
			meta: { matchId: context.komplettligaen?.config?.matchId || null },
		}),
		candidate('match-session', session.logo, {
			reason: session.logo ? 'Active match session metadata contains a logo.' : 'No active match session logo available.',
			meta: { sessionId: context.session?.id || null },
		}),
		candidate('gsi', null, {
			valid: false,
			reason: 'CS2 GSI does not provide team logos.',
		}),
		candidate('filesystem-logo', fsLogo.path, {
			valid: !!fsLogo.exists,
			reason: fsLogo.exists
				? 'A matching local filesystem logo exists in the HUD theme chain.'
				: 'No matching local filesystem logo exists for the resolved team name.',
			meta: { exists: !!fsLogo.exists },
		}),
		candidate('fallback', null, {
			valid: false,
			reason: 'No fallback team logo is configured.',
		}),
	]

	const finalLogo = pickFirstValid(logoCandidates)
	const warnings = []
	if (isGenericGsiTeamName(gsiName)) {
		warnings.push(`Ignored generic GSI ${side} name "${gsiName || sideFallbackName(side)}".`)
	}
	if (!finalLogo?.value) {
		warnings.push(`No resolved ${side} team logo.`)
	}

	return {
		side,
		final: {
			name: resolvedName,
			logo: finalLogo?.value || null,
			nameSource: finalName?.source || 'fallback',
			logoSource: finalLogo?.source || null,
			confidence: confidenceForSource(finalName?.source),
			warnings,
		},
		candidates: {
			name: nameCandidates,
			logo: logoCandidates,
		},
	}
}

export const resolveTeamIdentities = (context) => {
	const teams = {
		CT: resolveTeamIdentity('CT', context),
		T: resolveTeamIdentity('T', context),
	}

	const warnings = []
	const ctName = teams.CT.final.name?.trim().toLowerCase()
	const tName = teams.T.final.name?.trim().toLowerCase()
	const ctLogo = teams.CT.final.logo?.trim().toLowerCase()
	const tLogo = teams.T.final.logo?.trim().toLowerCase()

	if (ctName && tName && ctName === tName) {
		warnings.push(`Duplicate resolved team name: "${teams.CT.final.name}".`)
		teams.CT.final.warnings.push('Resolved name duplicates the T side.')
		teams.T.final.warnings.push('Resolved name duplicates the CT side.')
	}

	if (ctLogo && tLogo && ctLogo === tLogo) {
		warnings.push(`Duplicate resolved team logo: "${teams.CT.final.logo}".`)
		teams.CT.final.warnings.push('Resolved logo duplicates the T side.')
		teams.T.final.warnings.push('Resolved logo duplicates the CT side.')
	}

	return {
		generatedAt: new Date().toISOString(),
		teams,
		warnings,
	}
}
