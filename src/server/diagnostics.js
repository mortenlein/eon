import { buildTeamIdentityContext } from './team-identity-context.js'
import { resolveTeamIdentities } from './team-identity-resolver.js'

export const registerDiagnosticsRoutes = (router) => {
	router.get('/api/diagnostics/team-identity', async (context) => {
		const identityContext = await buildTeamIdentityContext()
		const diagnostics = resolveTeamIdentities(identityContext)

		context.body = {
			...diagnostics,
			context: {
				themeTree: identityContext.themeTree,
				komplettligaen: {
					matchId: identityContext.komplettligaen.config?.matchId || '',
					source: identityContext.komplettligaen.source,
					stale: identityContext.komplettligaen.stale,
					home: identityContext.komplettligaen.match?.home || null,
					away: identityContext.komplettligaen.match?.away || null,
				},
				session: identityContext.session
					? {
						id: identityContext.session.id,
						status: identityContext.session.status,
						teams: identityContext.session.teams,
					}
					: null,
				slots: {
					CT: identityContext.slots.ct.sidebarSlot,
					T: identityContext.slots.t.sidebarSlot,
				},
			},
		}
	})
}
