<template>
	<div :class="['eon-config-spa', { '--sidebar-collapsed': isSidebarCollapsed }]">
		<aside class="sidebar">
			<div class="sidebar-brand">
				<img src="/favicon.svg" class="logo" />
				<span v-if="!isSidebarCollapsed">Eon Suite</span>
				<button class="btn-collapse" @click="isSidebarCollapsed = !isSidebarCollapsed">
					<NavIcon :name="isSidebarCollapsed ? 'portability' : 'layout'" />
				</button>
			</div>
			
			<nav class="nav-links">
				<button 
					v-for="cat in categories" 
					:key="cat.id"
					:class="['nav-item', { '--active': state.activeCategory === cat.id }]"
					@click="state.activeCategory = cat.id"
				>
					<span class="nav-icon">
						<NavIcon :name="cat.icon" />
					</span>
					<span class="nav-label">{{ cat.label }}</span>
				</button>
			</nav>

			<div class="sidebar-footer">
				<div class="sync-status" :class="{ '--synced': state.isSynced }">
					{{ state.isSynced ? 'Connected' : 'Connecting...' }}
				</div>
			</div>
		</aside>

		<main class="content-area">
			<header class="content-header">
				<h1>{{ currentCategoryLabel }}</h1>
				<div class="header-actions">
					<span class="save-indicator" :class="`--${state.saveState}`">
						{{ saveMessage }}
					</span>
					<button class="btn-secondary" @click="actions.forceRefresh()" style="margin-right: 8px;">Force HUD Refresh</button>
					<button class="btn-primary" @click="actions.save()">Save All Changes</button>
				</div>
			</header>

			<div class="category-view">
				<component :is="activeComponent" />
			</div>

			<!-- Caster Alerts -->
			<div class="caster-alerts">
				<div 
					v-for="alert in state.alerts" 
					:key="alert.id"
					:class="['alert', `--${alert.type}`]"
				>
					{{ alert.message }}
				</div>
			</div>
		</main>
	</div>
</template>

<script>
import { state, actions } from '/config/store.js'
import Dashboard from '/config/components/Dashboard.vue'
import OptionsEditor from '/config/components/OptionsEditor.vue'
import LayoutEditor from '/config/components/LayoutEditor.vue'
import TeamsEditor from '/config/components/TeamsEditor.vue'
import SeriesEditor from '/config/components/SeriesEditor.vue'
import MatchRulesEditor from '/config/components/MatchRulesEditor.vue'
import SponsorsEditor from '/config/components/SponsorsEditor.vue'
import PortabilityEditor from '/config/components/PortabilityEditor.vue'

const iconPaths = {
	live: ['M6 12h12', 'M12 6v12', 'M8.5 8.5h7v7h-7z'],
	layout: ['M4 5h16v14H4z', 'M4 10h16', 'M10 10v9'],
	series: ['M7 5h10', 'M7 12h10', 'M7 19h10', 'M4 5h.01', 'M4 12h.01', 'M4 19h.01'],
	rules: ['M7 4h10l3 3v13H7z', 'M17 4v4h4', 'M10 12h7', 'M10 16h5'],
	teams: ['M8 11a4 4 0 1 1 8 0', 'M3 20a7 7 0 0 1 14 0', 'M18 14a5 5 0 0 1 3 5'],
	sponsors: ['M5 7h14v10H5z', 'M8 10h8', 'M8 14h5'],
	options: ['M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8', 'M12 2v3', 'M12 19v3', 'M4.93 4.93l2.12 2.12', 'M16.95 16.95l2.12 2.12', 'M2 12h3', 'M19 12h3', 'M4.93 19.07l2.12-2.12', 'M16.95 7.05l2.12-2.12'],
	portability: ['M16 3l4 4l-4 4', 'M20 7h-9', 'M8 21l-4 -4l4 -4', 'M4 17h9'],
}

const NavIcon = {
	props: ['name'],
	computed: {
		paths() {
			return iconPaths[this.name] || iconPaths.options
		},
	},
	template: `
		<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path v-for="path in paths" :key="path" :d="path" />
		</svg>
	`,
}

export default {
	components: {
		NavIcon,
	},
	setup() {
		return { state, actions }
	},
	data() {
		return {
			isSidebarCollapsed: false,
			categories: [
				{ id: 'dashboard', label: 'Live Control', icon: 'live', component: Dashboard },
				{ id: 'layout', label: 'Layout Editor', icon: 'layout', component: LayoutEditor },
				{ id: 'series', label: 'Series Setup', icon: 'series', component: SeriesEditor },
				{ id: 'rules', label: 'Match Rules', icon: 'rules', component: MatchRulesEditor },
				{ id: 'teams', label: 'Teams Setup', icon: 'teams', component: TeamsEditor },
				{ id: 'sponsors', label: 'Sponsors', icon: 'sponsors', component: SponsorsEditor },
				{ id: 'options', label: 'HUD Options', icon: 'options', component: OptionsEditor },
				{ id: 'portability', label: 'Import / Export', icon: 'portability', component: PortabilityEditor },
			]
		}
	},
	computed: {
		activeComponent() {
			return this.categories.find(c => c.id === this.state.activeCategory)?.component
		},
		currentCategoryLabel() {
			return this.categories.find(c => c.id === this.state.activeCategory)?.label || 'Dashboard'
		},
		saveMessage() {
			switch (this.state.saveState) {
				case 'saving': return 'Saving...'
				case 'saved': return 'Saved successfully'
				case 'error': return 'Save failed'
				default: return ''
			}
		}
	},
	mounted() {
		this.actions.init()
	}
}
</script>

<style scoped>
.eon-config-spa {
	display: grid;
	grid-template-columns: 240px 1fr;
	height: 100vh;
	background: #121418;
	color: #eee;
	transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.eon-config-spa.--sidebar-collapsed {
	grid-template-columns: 72px 1fr;
}

.sidebar {
	background: #1a1d23;
	border-right: 1px solid #2d333b;
	display: flex;
	flex-direction: column;
}

.sidebar-brand {
	padding: 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-weight: 700;
	font-size: 1.2rem;
	color: #fff;
}

.--sidebar-collapsed .sidebar-brand {
	padding: 20px 0;
	flex-direction: column;
}

.btn-collapse {
	background: none;
	border: none;
	color: #8b949e;
	padding: 4px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
}

.btn-collapse:hover {
	background: #2d333b;
	color: #fff;
}

.btn-collapse svg {
	width: 18px;
	height: 18px;
}

.logo { width: 32px; height: 32px; }

.nav-links {
	flex: 1;
	padding: 12px;
}

.nav-item {
	width: 100%;
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	background: none;
	border: none;
	border-radius: 8px;
	color: #8b949e;
	cursor: pointer;
	transition: all 0.2s;
	text-align: left;
}

.nav-item:hover { background: #2d333b; color: #fff; }
.nav-item.--active { background: #3498db; color: #fff; font-weight: 600; }

.--sidebar-collapsed .nav-item {
	padding: 12px 0;
	justify-content: center;
}

.--sidebar-collapsed .nav-label {
	display: none;
}

.nav-icon {
	width: 20px;
	height: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 20px;
}

.nav-icon svg {
	width: 20px;
	height: 20px;
	display: block;
}

.nav-label {
	min-width: 0;
}

.content-area {
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.content-header {
	padding: 16px 24px;
	background: #1a1d23;
	border-bottom: 1px solid #2d333b;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

@media (max-width: 768px) {
	.eon-config-spa {
		grid-template-columns: 64px 1fr;
	}
	.nav-label { display: none; }
	.sidebar-brand span { display: none; }
	.content-header { padding: 12px 16px; }
	.content-header h1 { font-size: 1.2rem; }
	.header-actions .btn-secondary { display: none; }
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 16px;
}

.category-view {
	flex: 1;
	overflow-y: auto;
	padding: 32px;
}

.save-indicator {
	font-size: 0.9rem;
	opacity: 0;
	transition: opacity 0.3s;
}

.save-indicator.--saving,
.save-indicator.--saved,
.save-indicator.--error { opacity: 1; }
.save-indicator.--saved { color: #2ecc71; }
.save-indicator.--error { color: #e74c3c; }

.btn-primary {
	background: #3498db;
	color: #fff;
	border: none;
	padding: 8px 16px;
	border-radius: 6px;
	font-weight: 600;
	cursor: pointer;
}

.btn-primary:hover { background: #2980b9; }

.btn-secondary {
	background: #21262d;
	border: 1px solid #30363d;
	color: #c9d1d9;
	padding: 8px 16px;
	border-radius: 6px;
	font-weight: 600;
	cursor: pointer;
}

.btn-secondary:hover { background: #30363d; color: #fff; }

.caster-alerts {
	position: fixed;
	bottom: 32px;
	right: 32px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	z-index: 9999;
}

.alert {
	padding: 16px 24px;
	border-radius: 8px;
	background: #1a1d23;
	color: #fff;
	font-weight: 600;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	border-left: 4px solid #3498db;
	animation: slideIn 0.3s ease-out;
}

.alert.--success { border-left-color: #2ecc71; }
.alert.--warning { border-left-color: #f1c40f; color: #000; background: #fff; }

@keyframes slideIn {
	from { transform: translateX(100%); opacity: 0; }
	to { transform: translateX(0); opacity: 1; }
}
</style>
