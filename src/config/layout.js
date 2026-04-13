(function () {
'use strict';

const VP_W = 1920, VP_H = 1080;
const GRID_SIZES = [0, 5, 10, 20, 50];
let gridIdx = 2;
let snapEnabled = true;

const DEFS = [
	{
		id: 'radar', label: 'Radar',
		color: 'rgba(52,152,219,0.3)', border: 'rgba(52,152,219,0.65)',
		baseW: 480, baseH: 480,
		anchor: { v: 'top', h: 'left' },
		props: [
			{ key: 'css.lan66-radar-top', edge: 'top' },
			{ key: 'css.lan66-radar-left', edge: 'left' },
		],
		resizable: true, keepAspect: true,
		sizeKey: 'css.radar-width', sizeUnit: '%', sizeRef: VP_W,
	},
	{
		id: 'top-bar', label: 'Top Bar',
		color: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.35)',
		baseW: 960, baseH: 50,
		anchor: { v: 'top', h: 'center' },
		props: [{ key: 'css.lan66-top-bar-top', edge: 'top' }],
		sizeKey: 'css.top-bar-width',
	},
	{
		id: 'players-alive', label: 'Players Alive',
		color: 'rgba(56,148,107,0.3)', border: 'rgba(56,148,107,0.65)',
		baseW: 110, baseH: 35,
		anchor: { v: 'top', h: 'right' },
		props: [
			{ key: 'css.lan66-players-alive-top', edge: 'top' },
			{ key: 'css.lan66-players-alive-right', edge: 'right' },
		],
	},
	{
		id: 'sponsor-left', label: 'Sponsor Left',
		color: 'rgba(220,180,80,0.2)', border: 'rgba(220,180,80,0.5)',
		baseW: 130, baseH: 48,
		anchor: { v: 'top', h: 'left' },
		props: [
			{ key: 'css.lan66-sponsor-left-top', edge: 'top' },
			{ key: 'css.lan66-sponsor-left-left', edge: 'left' },
		],
		resizable: true,
		sizeKey: 'css.sponsor-panel-width', sizeUnit: 'rem',
	},
	{
		id: 'sponsor-right', label: 'Sponsor Right',
		color: 'rgba(220,180,80,0.2)', border: 'rgba(220,180,80,0.5)',
		baseW: 130, baseH: 48,
		anchor: { v: 'top', h: 'right' },
		props: [
			{ key: 'css.lan66-sponsor-right-top', edge: 'top' },
			{ key: 'css.lan66-sponsor-right-right', edge: 'right' },
		],
		resizable: true,
		sizeKey: 'css.sponsor-panel-width', sizeUnit: 'rem',
	},
	{
		id: 'sidebar-left', label: 'Left Sidebar',
		color: 'rgba(240,151,37,0.22)', border: 'rgba(240,151,37,0.55)',
		baseW: 580, baseH: 200,
		anchor: { v: 'bottom', h: 'left' },
		props: [
			{ key: 'css.lan66-sidebar-left', edge: 'left' },
			{ key: 'css.lan66-sidebar-bottom', edge: 'bottom' },
		],
		resizable: true,
		scaleKeys: { x: 'css.lan66-sidebar-scale-x', y: 'css.lan66-sidebar-scale-y' },
	},
	{
		id: 'sidebar-right', label: 'Right Sidebar',
		color: 'rgba(240,151,37,0.22)', border: 'rgba(240,151,37,0.55)',
		baseW: 580, baseH: 200,
		anchor: { v: 'bottom', h: 'right' },
		props: [
			{ key: 'css.lan66-sidebar-right', edge: 'right' },
			{ key: 'css.lan66-sidebar-bottom', edge: 'bottom' },
		],
		resizable: true,
		scaleKeys: { x: 'css.lan66-sidebar-scale-x', y: 'css.lan66-sidebar-scale-y' },
	},
	{
		id: 'focused-player', label: 'Focused Player',
		color: 'rgba(155,89,182,0.22)', border: 'rgba(155,89,182,0.55)',
		baseW: 960, baseH: 70,
		anchor: { v: 'bottom', h: 'center' },
		props: [{ key: 'css.lan66-focused-player-bottom', edge: 'bottom' }],
	},
	{
		id: 'event-badge', label: 'Event Badge',
		color: 'rgba(240,49,37,0.22)', border: 'rgba(240,49,37,0.55)',
		baseW: 220, baseH: 45,
		anchor: { v: 'top', h: 'left' },
		props: [
			{ key: 'css.lan66-event-badge-top', edge: 'top' },
			{ key: 'css.lan66-event-badge-left', edge: 'left' },
		],
		resizable: true, keepAspect: true,
		sizeKey: 'css.lan66-event-badge-width', sizeUnit: 'rem',
	},
	{
		id: 'current-map', label: 'Current Map',
		color: 'rgba(100,180,240,0.18)', border: 'rgba(100,180,240,0.5)',
		baseW: 160, baseH: 90,
		anchor: { v: 'bottom', h: 'right' },
		props: [
			{ key: 'css.lan66-current-map-bottom', edge: 'bottom' },
			{ key: 'css.lan66-current-map-right', edge: 'right' },
		],
		resizable: true, keepAspect: false,
		sizeKey: 'css.lan66-current-map-width', sizeUnit: 'rem',
	},
];

/* ═══════════════  State  ═══════════════ */
let opts = {};
let initialTheme = null;
let remPx = 10;
let els = [];
let selectedId = null;
let drag = null;
let viewPlayerCount = 5;

/* ═══════════════  Init  ═══════════════ */
let socket;
let wsQueue = [];
let wsLastTime = 0;
let wsRaf = null;

function processWsQueue(timestamp) {
	if (timestamp - wsLastTime < 16) {
		wsRaf = requestAnimationFrame(processWsQueue);
		return;
	}
	wsLastTime = timestamp;
	wsRaf = null;

	if (wsQueue.length === 0) return;

	const messages = [...wsQueue];
	wsQueue = [];
	let needsSync = false;

	messages.forEach(msg => {
		try {
			const { event, body } = JSON.parse(msg.data);
			if (event === 'config:update') {
				if (body.key && body.value !== undefined) {
					opts[body.key] = body.value;
					needsSync = true;
				}
			} else if (event === 'state') {
				if (body.options) {
					Object.assign(opts, body.options);
					needsSync = true;
				}
			}
		} catch (err) {}
	});

	if (needsSync) {
		syncLayoutState();
		syncAdvancedEditor();
	}
}

function initWebSocket() {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	socket = new WebSocket(`${protocol}//${window.location.host}`);
	
	socket.onmessage = (msg) => {
		wsQueue.push(msg);
		if (!wsRaf) {
			wsRaf = requestAnimationFrame(processWsQueue);
		}
	};

	socket.onclose = () => setTimeout(initWebSocket, 1000);
}

function syncLayoutState() {
	computeRemPx();
	els.forEach(el => {
		const scaleX = el.def.scaleKeys ? resolveNum(el.def.scaleKeys.x, 1) : 1;
		const scaleY = el.def.scaleKeys ? resolveNum(el.def.scaleKeys.y, 1) : 1;
		
		let bw = el.def.baseW;
		let bh = el.def.baseH;

		if (el.def.sizeKey) {
			const refSize = (el.def.sizeKey.includes('width') || el.def.sizeKey.includes('left') || el.def.sizeKey.includes('right')) ? VP_W : VP_H;
			bw = evaluateCss(opts[el.def.sizeKey], refSize, el.def.baseW);
			if (el.def.keepAspect) bh = bw * (el.def.baseH / el.def.baseW);
		}

		if (el.def.id.startsWith('sponsor-')) {
			bw = evaluateCss(opts['css.sponsor-panel-width'], VP_W, 130);
			bh = evaluateCss(opts['css.sponsor-panel-height'], VP_H, 48);
		}

		el.baseW = bw; el.baseH = bh; el.scaleX = scaleX; el.scaleY = scaleY;
		el.w = bw * scaleX; el.h = bh * scaleY;

		const positions = {};
		for (const prop of el.def.props) {
			const refSize = (prop.edge === 'top' || prop.edge === 'bottom') ? VP_H : VP_W;
			positions[prop.edge] = evaluateCss(opts[prop.key], refSize, 11);
		}

		if (el.def.anchor.v === 'top') el.top = (positions.top ?? 0);
		else el.top = VP_H - (positions.bottom ?? 0) - el.h;

		if (el.def.anchor.h === 'left') el.left = (positions.left ?? 0);
		else if (el.def.anchor.h === 'right') el.left = VP_W - (positions.right ?? 0) - el.w;
		else el.left = (VP_W - el.w) / 2;

		positionEl(el, false);
	});
	updatePanel();
	updateLayerList();
}

function broadcast(key, value) {
	if (socket && socket.readyState === 1) {
		socket.send(JSON.stringify({ event: 'config:update', body: { key, value } }));
	}
}

async function init() {
	try {
		initWebSocket();
		await loadOptions();
		computeRemPx();
		buildElements();
		layoutViewport();
		attachGlobalEvents();
		updateGridOverlay();
		buildLayerList();
		initPresets();
		initSubNav();
		initAdvancedEditor();
		renderPreferences();
		renderSystemBranding();
		renderEventBranding();
		renderPromotionBranding();
		renderSponsorBranding();
		window.addEventListener('resize', layoutViewport);
	} catch (err) {
		console.error('Initialization failed:', err);
		document.getElementById('save-status').textContent = 'Init Error!';
	}
}

async function loadOptions() {
	const res = await fetch('/config/options');
	const json = await res.json();
	opts = {};
	for (const o of json) {
		opts[o.key] = o.value ?? o.fallback ?? null;
		if (o.key === 'theme') initialTheme = opts[o.key];
	}
}

function computeRemPx() {
	const raw = String(opts['css.base-scale-factor'] || '0.925925926vh');
	const val = parseFloat(raw);
	if (raw.includes('vh')) remPx = val * VP_H / 100;
	else if (raw.includes('vw')) remPx = val * VP_W / 100;
	else remPx = val || 10;
}

/* ═══════════════  Value helpers  ═══════════════ */
function resolveNum(key, fb) { const v = opts[key]; return v != null ? (parseFloat(v) || fb) : fb; }

function evaluateCss(val, refSize = VP_W, fb = 0) {
	if (val == null || val === undefined) return fb;
	let s = String(val).trim();
	if (! s) return fb;

	// Resolve var() recursively
	let varMatch;
	let safety = 0;
	while ((varMatch = s.match(/var\(--(.+?)\)/)) && safety++ < 10) {
		const key = 'css.' + varMatch[1];
		let replacement = opts[key];
		if (replacement === undefined || replacement === null) {
			// Try without css. prefix (for internal theme vars)
			replacement = opts[varMatch[1]] || '0';
		}
		s = s.replace(varMatch[0], replacement);
	}

	// Handle clamp(min, preferred, max)
	if (s.includes('clamp(')) {
		s = s.replace(/clamp\((.+?)\)/g, (match, inner) => {
			const parts = inner.split(',').map(p => evaluateCss(p.trim(), refSize, fb));
			return Math.max(parts[0], Math.min(parts[1], parts[2]));
		});
	}

	// Handle calc(...) - basic unit replacement
	if (s.includes('calc(')) {
		s = s.replace(/calc\((.+?)\)/g, (match, inner) => inner);
	}

	// Convert units to pixels
	const unitMap = {
		'rem': remPx,
		'vh': VP_H / 100,
		'vw': VP_W / 100,
		'px': 1,
		'%': refSize / 100
	};

	Object.entries(unitMap).forEach(([unit, mult]) => {
		const re = new RegExp(`([\\d\\.-]+)${unit === '%' ? '%' : unit}`, 'g');
		s = s.replace(re, (match, num) => parseFloat(num) * mult);
	});

	// Evaluate safe math
	try {
		if (/^[ \d\.\-\+\*\/\(\)]+$/.test(s)) {
			// Use Function constructor for a slightly safer eval
			return new Function(`return (${s})`)();
		}
	} catch (e) {
		console.warn('math eval failed for:', s, e);
	}

	return parseFloat(s) || fb;
}

function remToPx(r) { return r * remPx; }
function pxToRem(p) { return p / remPx; }
function snap(v) { const g = GRID_SIZES[gridIdx]; return (g && snapEnabled) ? Math.round(v / g) * g : v; }

/* ═══════════════  Mock content  ═══════════════ */
function createMockContent(def) {
	const w = document.createElement('div');
	w.className = 'mock-inner';
	if (def.id === 'radar') {
		w.innerHTML = '<div class="mock-radar"><div class="mock-radar-grid"></div><div class="mock-radar-center">+</div><div class="mock-radar-label">RADAR</div></div>';
	} else if (def.id === 'top-bar') {
		w.innerHTML = '<div class="mock-topbar"><div class="mock-topbar-team"><div class="mock-team-logo ct"></div><span>Counter-Terrorists</span></div><div class="mock-topbar-score"><span class="ct-score">7</span><span class="mock-timer">1:45</span><span class="t-score">8</span></div><div class="mock-topbar-team --right"><span>Terrorists</span><div class="mock-team-logo t"></div></div></div>';
	} else if (def.id.startsWith('sidebar-')) {
		let rows = '';
		for (let i = 0; i < viewPlayerCount; i++) rows += `<div class="mock-player-row"><span class="mock-hp-bar" style="width:${60+Math.random()*40}%"></span><span class="mock-player-name">Player ${i+1}</span><span class="mock-player-stat">${Math.floor(50+Math.random()*50)}</span></div>`;
		w.innerHTML = `<div class="mock-sidebar">${rows}</div>`;
	} else if (def.id === 'focused-player') {
		w.innerHTML = '<div class="mock-focused"><div class="mock-focused-hp"><div class="mock-focused-hp-fill" style="width:73%"></div></div><div class="mock-focused-info"><span class="mock-focused-name">PlayerName</span><span class="mock-focused-weapon">AK-47</span></div></div>';
	} else if (def.id === 'players-alive') {
		w.innerHTML = '<div class="mock-alive"><span class="ct-dots">● ● ● ●</span><span class="t-dots">● ● ●</span></div>';
	} else if (def.id === 'event-badge') {
		w.innerHTML = '<div class="mock-badge"><div class="mock-badge-icon">◆</div><div class="mock-badge-text"><div class="mock-badge-title">LAN66NORD</div><div class="mock-badge-sub">17-19 APR</div></div></div>';
	} else if (def.id === 'current-map') {
		w.innerHTML = '<div class="mock-current-map"><div class="mock-map-image"></div><div class="mock-map-overlay"><div class="mock-map-label">NOW PLAYING</div><div class="mock-map-name">Inferno</div></div></div>';
	} else if (def.id.startsWith('sponsor-')) {
		w.innerHTML = '<div class="mock-sponsor"><div class="mock-sponsor-icon">★</div><div class="mock-sponsor-label">SPONSOR</div></div>';
	}
	return w;
}

/* ═══════════════  Build elements  ═══════════════ */
function buildElements() {
	const vp = document.getElementById('viewport');
	els = [];
	for (const def of DEFS) {
		const scaleX = def.scaleKeys ? resolveNum(def.scaleKeys.x, 1) : 1;
		const scaleY = def.scaleKeys ? resolveNum(def.scaleKeys.y, 1) : 1;
		let bw = def.baseW, bh = def.baseH;

		if (def.sizeKey) {
			const refSize = (def.sizeKey.includes('width') || def.sizeKey.includes('left') || def.sizeKey.includes('right')) ? VP_W : VP_H;
			bw = evaluateCss(opts[def.sizeKey], refSize, def.baseW);
			if (def.keepAspect) bh = bw * (def.baseH / def.baseW);
		}

		// Sponsor specifically uses panel width/height variables
		if (def.id.startsWith('sponsor-')) {
			bw = evaluateCss(opts['css.sponsor-panel-width'], VP_W, 130);
			bh = evaluateCss(opts['css.sponsor-panel-height'], VP_H, 48);
		}

		let w = bw * scaleX, h = bh * scaleY;

		const positions = {};
		for (const p of def.props) {
			const refSize = (p.edge === 'top' || p.edge === 'bottom') ? VP_H : VP_W;
			// Use 1.15rem (~11px) as a safe fallback for positions
			positions[p.edge] = evaluateCss(opts[p.key], refSize, 11);
		}

		let top = 0, left = 0;
		if (def.anchor.v === 'top') top = (positions.top ?? 0);
		else top = VP_H - (positions.bottom ?? 0) - h;

		if (def.anchor.h === 'left') left = (positions.left ?? 0);
		else if (def.anchor.h === 'right') left = VP_W - (positions.right ?? 0) - w;
		else left = (VP_W - w) / 2; // Exact centering matching CSS calc((100% - W) / 2)

		const dom = document.createElement('div');
		dom.className = 'hud-el';
		if (def.readonly) dom.classList.add('--readonly');
		dom.dataset.id = def.id;
		dom.style.borderColor = def.border;
		
		const mock = createMockContent(def);
		dom.appendChild(mock);

		if (def.scaleKeys) {
			const inner = mock.querySelector('.mock-inner');
			if (inner) {
				inner.style.width = bw + 'px';
				inner.style.height = bh + 'px';
				inner.style.minWidth = bw + 'px';
				inner.style.transformOrigin = def.anchor.h === 'left' ? 'bottom left' : (def.anchor.h === 'right' ? 'bottom right' : 'bottom center');
				inner.style.transform = `scale(${scaleX}, ${scaleY})`;
			}
		}

		if (def.resizable) {
			const hx = document.createElement('div');
			hx.className = 'resize-h --x'; hx.dataset.axis = 'x';
			if (def.anchor.h === 'left' || def.anchor.h === 'center') hx.style.right = '-4px';
			else hx.style.left = '-4px';
			dom.appendChild(hx);
			if (!def.keepAspect) {
				const hy = document.createElement('div');
				hy.className = 'resize-h --y'; hy.dataset.axis = 'y'; dom.appendChild(hy);
			}
		}

		vp.appendChild(dom);
		const visible = opts[`css.lan66-${def.id}-display`] !== 'none';
		const el = { def, dom, top, left, w, h, baseW: bw, baseH: bh, scaleX, scaleY, visible };
		els.push(el);
		positionEl(el, false);
	}
}

function createImageUploader(key) {
	const uploader = document.createElement('div');
	uploader.className = 'logo-uploader';
	
	const preview = document.createElement('img');
	preview.className = 'logo-preview';
	preview.src = opts[key] || '/hud/img/branding/logo-ubg.png';
	
	const btn = document.createElement('button');
	btn.className = 'btn-ghost';
	btn.textContent = 'Upload Image';
	
	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.accept = 'image/png, image/jpeg, image/svg+xml, image/gif';
	fileInput.style.display = 'none';
	
	btn.addEventListener('click', () => fileInput.click());
	
	fileInput.addEventListener('change', async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		
		btn.textContent = 'Uploading...';
		btn.disabled = true;
		
		const reader = new FileReader();
		reader.onload = async (ev) => {
			try {
				const res = await fetch('/config/upload-image', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ filename: file.name, base64: ev.target.result })
				});
				if (res.ok) {
					const { url } = await res.json();
					opts[key] = url;
					preview.src = url;
					broadcast(key, url);
					syncAdvancedEditor();
					btn.textContent = 'Upload Image';
				} else {
					btn.textContent = 'Error!';
				}
			} catch (err) {
				btn.textContent = 'Error!';
				console.error(err);
			}
			btn.disabled = false;
			setTimeout(() => { if(btn.textContent === 'Error!') btn.textContent = 'Upload Image'; }, 3000);
		};
		reader.readAsDataURL(file);
	});
	
	uploader.appendChild(preview);
	uploader.appendChild(btn);
	uploader.appendChild(fileInput);
	
	return uploader;
}

function renderEventBranding() {
	const container = document.getElementById('event-branding-fields');
	if (! container) return;
	container.innerHTML = '';

	const fields = [
		{ key: 'series.logoUrl', label: 'Event Logo URL', type: 'upload' },
		{ key: 'series.name.center', label: 'Event Name' },
		{ key: 'series.name.left', label: 'Event Metadata (Left)' },
		{ key: 'series.name.right', label: 'Event Metadata (Right)' },
	];

	fields.forEach(f => {
		const row = document.createElement('div');
		row.className = 'panel-field';

		const label = document.createElement('label');
		label.textContent = f.label;
		row.appendChild(label);

		if (f.type === 'upload') {
			row.appendChild(createImageUploader(f.key));
		} else {
			const input = document.createElement('input');
			input.type = 'text';
			input.value = opts[f.key] || '';
			input.placeholder = 'None';
			input.addEventListener('input', () => {
				opts[f.key] = input.value;
				broadcast(f.key, input.value);
				syncAdvancedEditor();
			});
			row.appendChild(input);
		}

		container.appendChild(row);
	});
}

function renderSystemBranding() {
	const container = document.getElementById('system-branding-fields');
	if (! container) return;
	container.innerHTML = '';

	const row = document.createElement('div');
	row.className = 'panel-field';

	const label = document.createElement('label');
	label.textContent = 'HUD Theme';
	row.appendChild(label);

	const select = document.createElement('select');
	select.className = 'custom-select';
	
	// Available themes found in src/themes
	const themes = ['fennec', 'lan66nord', 'raw'];
	themes.forEach(t => {
		const opt = document.createElement('option');
		opt.value = t;
		opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
		if (opts.theme === t) opt.selected = true;
		select.appendChild(opt);
	});

	select.addEventListener('change', () => {
		opts.theme = select.value;
		syncAdvancedEditor();
	});

	row.appendChild(select);
	container.appendChild(row);
}

function renderPromotionBranding() {
	const container = document.getElementById('promotion-branding-fields');
	if (! container) return;
	container.innerHTML = '';

	const fields = [
		{ key: 'promotion.visible', label: 'Visible', type: 'checkbox' },
		{ key: 'promotion.autoShow', label: 'Auto-show (Freezetime)', type: 'checkbox' },
		{ key: 'promotion.side', label: 'Alignment Side', type: 'select', options: ['left', 'right'] },
		{ key: 'promotion.imageUrl', label: 'Promo Image (Upload)', type: 'upload' },
		{ key: 'promotion.title', label: 'Title Text' },
		{ key: 'promotion.subtitle', label: 'Subtitle / CTA' },
	];

	fields.forEach(f => {
		const row = document.createElement('div');
		row.className = 'panel-field';

		const label = document.createElement('label');
		label.textContent = f.label;
		row.appendChild(label);

		if (f.type === 'upload') {
			row.appendChild(createImageUploader(f.key));
		} else if (f.type === 'checkbox') {
			const input = document.createElement('input');
			input.type = 'checkbox';
			input.checked = !!opts[f.key];
			input.addEventListener('change', () => {
				opts[f.key] = input.checked;
				broadcast(f.key, input.checked);
				syncAdvancedEditor();
			});
			row.appendChild(input);
		} else if (f.type === 'select') {
			const select = document.createElement('select');
			select.className = 'custom-select';
			f.options.forEach(optVal => {
				const opt = document.createElement('option');
				opt.value = optVal;
				opt.textContent = optVal.charAt(0).toUpperCase() + optVal.slice(1);
				if (opts[f.key] === optVal) opt.selected = true;
				select.appendChild(opt);
			});
			select.addEventListener('change', () => {
				opts[f.key] = select.value;
				broadcast(f.key, select.value);
				syncAdvancedEditor();
			});
			row.appendChild(select);
		} else {
			const input = document.createElement('input');
			input.type = 'text';
			input.value = opts[f.key] || '';
			input.placeholder = 'None';
			input.addEventListener('input', () => {
				opts[f.key] = input.value;
				broadcast(f.key, input.value);
				syncAdvancedEditor();
			});
			row.appendChild(input);
		}

		container.appendChild(row);
	});
}

function renderSponsorBranding() {
	const container = document.getElementById('sponsor-branding-fields');
	if (! container) return;
	container.innerHTML = '';

	const fields = [
		{ key: 'sponsors.left.imageUrl', label: 'Left Image (Upload)', type: 'upload' },
		{ key: 'sponsors.left.title', label: 'Left Label' },
		{ key: 'sponsors.right.imageUrl', label: 'Right Image (Upload)', type: 'upload' },
		{ key: 'sponsors.right.title', label: 'Right Label' },
		{ key: 'sponsors.rotationInterval', label: 'Rotation Interval (ms)', type: 'number' },
	];

	fields.forEach(f => {
		const row = document.createElement('div');
		row.className = 'panel-field';

		const label = document.createElement('label');
		label.textContent = f.label;
		row.appendChild(label);

		if (f.type === 'upload') {
			row.appendChild(createImageUploader(f.key));
		} else {
			const input = document.createElement('input');
			input.type = f.type || 'text';
			input.value = opts[f.key] || '';
			input.placeholder = 'None';
			input.addEventListener('input', () => {
				opts[f.key] = input.type === 'number' ? (parseFloat(input.value) || 0) : input.value;
				broadcast(f.key, opts[f.key]);
				syncAdvancedEditor();
			});
			row.appendChild(input);
		}

		container.appendChild(row);
	});
}

function buildLayerList() {
	const container = document.getElementById('layer-list');
	container.innerHTML = '';
	for (const el of els) {
		const item = document.createElement('div');
		item.className = 'layer-item';
		item.dataset.id = el.def.id;
		
		const color = document.createElement('span');
		color.className = 'layer-color';
		color.style.background = el.def.border;
		item.appendChild(color);

		const name = document.createElement('span');
		name.className = 'layer-name';
		name.textContent = el.def.label;
		name.addEventListener('click', (e) => { e.stopPropagation(); selectEl(el.def.id); });
		item.appendChild(name);

		const toggle = document.createElement('button');
		toggle.className = 'btn-visibility';
		toggle.innerHTML = '👁';
		toggle.title = 'Toggle visibility';
		toggle.addEventListener('click', (e) => { e.stopPropagation(); toggleVisibility(el); });
		item.appendChild(toggle);

		item.addEventListener('click', () => selectEl(el.def.id));
		container.appendChild(item);
	}
	updateLayerList();
}

function updateLayerList() {
	document.querySelectorAll('.layer-item').forEach(item => {
		const el = els.find(x => x.def.id === item.dataset.id);
		item.classList.toggle('--active', item.dataset.id === selectedId);
		const btn = item.querySelector('.btn-visibility');
		if (btn && el) {
			btn.classList.toggle('--hidden', !el.visible);
			btn.innerHTML = el.visible ? '👁' : 'slash'; // No good icon for hidden without fontawesome, maybe '✕'
			btn.innerHTML = el.visible ? '👁' : '✕';
		}
	});
}

/* ═══════════════  Positioning  ═══════════════ */
function positionEl(el, triggerBroadcast = true) {
	el.dom.style.top = el.top + 'px';
	el.dom.style.left = el.left + 'px';
	el.dom.style.width = el.w + 'px';
	el.dom.style.height = el.h + 'px';
	el.dom.style.display = el.visible ? 'block' : 'none';

	if (triggerBroadcast) {
		// Broadcast position changed (for Ghost-Sync)
		const values = getConfigValues(el);
		for (const [key, val] of Object.entries(values)) {
			broadcast(key, val);
		}
	}
}

function layoutViewport() {
	const wrap = document.getElementById('viewport-wrap');
	const vp = document.getElementById('viewport');
	const availW = wrap.clientWidth - 32, availH = wrap.clientHeight - 32;
	const scale = Math.min(availW / VP_W, availH / VP_H, 1);
	vp.style.width  = Math.round(VP_W * scale) + 'px';
	vp.style.height = Math.round(VP_H * scale) + 'px';
}

function updateGridOverlay() {
	const vp = document.getElementById('viewport');
	const g = GRID_SIZES[gridIdx];
	const btn = document.getElementById('btn-grid');
	if (!g || !snapEnabled) { vp.style.backgroundImage = ''; vp.style.backgroundSize = ''; if (btn) btn.textContent = 'Grid: Off'; return; }
	const px = (g / VP_W * 100), py = (g / VP_H * 100);
	vp.style.backgroundImage = `repeating-linear-gradient(0deg,transparent,transparent calc(${py}% - 1px),rgba(255,255,255,0.04) calc(${py}% - 1px),rgba(255,255,255,0.04) ${py}%),repeating-linear-gradient(90deg,transparent,transparent calc(${px}% - 1px),rgba(255,255,255,0.04) calc(${px}% - 1px),rgba(255,255,255,0.04) ${px}%)`;
	vp.style.backgroundSize = '100% 100%';
	if (btn) btn.textContent = `Grid: ${g}px`;
}

function mouseToVp(e) {
	const vp = document.getElementById('viewport');
	const r = vp.getBoundingClientRect();
	return { x: (e.clientX - r.left) / r.width * VP_W, y: (e.clientY - r.top) / r.height * VP_H };
}

/* ═══════════════  Events  ═══════════════ */
function attachGlobalEvents() {
	const vp = document.getElementById('viewport');

	vp.addEventListener('mousedown', (e) => {
		const handle = e.target.closest('.resize-h');
		const elDom = e.target.closest('.hud-el');
		if (!elDom) { selectEl(null); return; }
		const el = els.find(x => x.def.id === elDom.dataset.id);
		if (!el) return;
		selectEl(el.def.id);
		if (el.def.readonly) return; // sponsors are view-only
		e.preventDefault();
		const mode = handle ? (handle.dataset.axis === 'x' ? 'rx' : 'ry') : 'move';
		drag = { el, startMx: e.clientX, startMy: e.clientY, startTop: el.top, startLeft: el.left, startW: el.w, startH: el.h, mode };
		elDom.classList.add('--dragging');
	});

	document.addEventListener('mousemove', (e) => {
		const c = mouseToVp(e);
		document.getElementById('status-coords').textContent = `${Math.round(c.x)}, ${Math.round(c.y)} px  ·  ${pxToRem(c.x).toFixed(1)}, ${pxToRem(c.y).toFixed(1)} rem`;
		if (!drag) return;
		e.preventDefault();
		const r = document.getElementById('viewport').getBoundingClientRect();
		const sx = VP_W / r.width, sy = VP_H / r.height;
		const dx = (e.clientX - drag.startMx) * sx, dy = (e.clientY - drag.startMy) * sy;
		const el = drag.el, def = el.def;

		if (drag.mode === 'move') {
			let nt = drag.startTop + dy, nl = drag.startLeft + dx;
			if (def.anchor.h === 'center') nl = drag.startLeft;
			el.top = snap(Math.max(0, Math.min(nt, VP_H - el.h)));
			el.left = snap(Math.max(0, Math.min(nl, VP_W - el.w)));
		} else if (drag.mode === 'rx') {
			if (def.keepAspect) {
				let nw = def.anchor.h === 'left' ? drag.startW + dx : drag.startW - dx;
				nw = snap(Math.max(50, Math.min(nw, VP_W * 0.6)));
				el.w = nw; el.h = nw; el.baseW = nw; el.baseH = nw;
			} else if (def.scaleKeys) {
				let nw = def.anchor.h === 'left' ? drag.startW + dx : drag.startW - dx;
				nw = Math.max(el.baseW * 0.2, Math.min(nw, el.baseW * 2));
				el.scaleX = nw / el.baseW; el.w = el.baseW * el.scaleX;
				if (def.anchor.h === 'right') el.left = VP_W - el.w - (VP_W - drag.startLeft - drag.startW);
				syncSidebarScale(el);
			} else {
				let nw = drag.startW + dx;
				if (def.anchor.h === 'right') nw = drag.startW - dx;
				nw = snap(Math.max(60, Math.min(nw, VP_W * 0.5)));
				el.w = nw; el.baseW = nw;
				if (def.anchor.h === 'right') el.left = VP_W - el.w - (VP_W - drag.startLeft - drag.startW);
			}
		} else if (drag.mode === 'ry') {
			if (el.def.resizeMode === 'horizontal') return;
			if (def.scaleKeys) {
				const nh = Math.max(el.baseH * 0.3, Math.min(drag.startH - dy, el.baseH * 2));
				el.scaleY = nh / el.baseH; el.h = el.baseH * el.scaleY;
				el.top = VP_H - el.h - (VP_H - drag.startTop - drag.startH);
				syncSidebarScale(el);
			} else if (def.sizeKey === 'css.lan66-sponsor-width') {
				const nh = Math.max(el.baseH * 0.3, Math.min(drag.startH - dy, el.baseH * 2));
				el.h = nh; el.baseH = nh;
				el.top = VP_H - el.h - (VP_H - drag.startTop - drag.startH);
			}
		}
		positionEl(el); 
		updatePanel();
		syncAdvancedEditor();
	});

	document.addEventListener('mouseup', () => { if (drag) { drag.el.dom.classList.remove('--dragging'); drag = null; } });

	document.addEventListener('keydown', (e) => {
		if (e.key.toLowerCase() === 's' && e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); save(); return; }
		const el = els.find(x => x.def.id === selectedId);
		if (!el || el.def.readonly) return;
		if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
		if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
		e.preventDefault();
		const step = e.shiftKey ? 10 : 1;
		if (e.key === 'ArrowUp') el.top = Math.max(0, el.top - step);
		else if (e.key === 'ArrowDown') el.top = Math.min(VP_H - el.h, el.top + step);
		else if (e.key === 'ArrowLeft' && el.def.anchor.h !== 'center') el.left = Math.max(0, el.left - step);
		else if (e.key === 'ArrowRight' && el.def.anchor.h !== 'center') el.left = Math.min(VP_W - el.w, el.left + step);
		positionEl(el); 
		updatePanel();
		syncAdvancedEditor();
	});

	document.getElementById('btn-save').addEventListener('click', save);
	document.getElementById('btn-refresh').addEventListener('click', async () => { await fetch('/config/force-hud-refresh', { method: 'POST' }); });
	document.getElementById('btn-grid').addEventListener('click', () => {
		gridIdx = (gridIdx + 1) % GRID_SIZES.length;
		snapEnabled = GRID_SIZES[gridIdx] !== 0;
		updateGridOverlay();
	});

	// Presets events
	document.getElementById('btn-preset-load').addEventListener('click', () => {
		const id = document.getElementById('preset-select').value;
		if (id) loadPreset(id);
	});
	document.getElementById('btn-preset-save').addEventListener('click', saveNewPreset);
	document.getElementById('btn-preset-rename').addEventListener('click', renameSelectedPreset);
	document.getElementById('btn-preset-delete').addEventListener('click', deleteSelectedPreset);
	document.getElementById('btn-preset-export').addEventListener('click', exportPresets);
	document.getElementById('btn-preset-import').addEventListener('click', () => document.getElementById('import-file').click());
	document.getElementById('import-file').addEventListener('change', importPresets);

	document.getElementById('view-mode-select').addEventListener('change', (e) => {
		viewPlayerCount = e.target.value === '2v2' ? 2 : 5;
		// Re-render sidebar mocks
		els.forEach(el => {
			if (el.def.id.startsWith('sidebar-')) {
				const inner = el.dom.querySelector('.mock-inner');
				inner.innerHTML = '';
				inner.appendChild(createMockContent(el.def).firstChild);
			}
		});
	});
}

/* ═══════════════  Modes Logic  ═══════════════ */
function initSubNav() {
	document.querySelectorAll('.nav-tab').forEach(btn => {
		btn.addEventListener('click', () => {
			const mode = btn.dataset.mode;
			document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('--active'));
			btn.classList.add('--active');

			document.querySelectorAll('.editor-view').forEach(v => v.classList.remove('active'));
			document.getElementById(`${mode}-wrap`).classList.add('active');

			if (mode === 'advanced') syncAdvancedEditor();
			if (mode === 'settings') renderPreferences();
		});
	});
}

function initAdvancedEditor() {
	const editor = document.getElementById('advanced-editor');
	editor.addEventListener('input', () => {
		try {
			const json = JSON.parse(editor.value);
			Object.assign(opts, json);
			syncLayoutState();
			// Broadcast for preview
			for (const [key, val] of Object.entries(json)) broadcast(key, val);
		} catch (e) {}
	});

	document.getElementById('btn-copy-json').addEventListener('click', () => {
		navigator.clipboard.writeText(editor.value);
		const old = document.getElementById('btn-copy-json').textContent;
		document.getElementById('btn-copy-json').textContent = 'Copied!';
		setTimeout(() => document.getElementById('btn-copy-json').textContent = old, 1500);
	});

	document.getElementById('btn-format-json').addEventListener('click', syncAdvancedEditor);
}

function syncAdvancedEditor() {
	const editor = document.getElementById('advanced-editor');
	const layoutOpts = {};
	Object.keys(opts).sort().forEach(k => {
		if (k.startsWith('css.') || k.startsWith('preferences.')) layoutOpts[k] = opts[k];
	});
	editor.value = JSON.stringify(layoutOpts, null, 4);
}

function renderPreferences() {
	const container = document.getElementById('preferences-list');
	container.innerHTML = '';
	
	const visualKeys = new Set();
	els.forEach(el => {
		if (el.props) el.props.forEach(p => visualKeys.add(p.key));
		if (el.sizeKey) visualKeys.add(el.sizeKey);
	});

	// Group layout-relevant settings
	const layoutPrefs = Object.keys(opts).filter(k => 
		k.startsWith('preferences.') || 
		(k.startsWith('css.') && !visualKeys.has(k) && !k.endsWith('-display'))
	).sort();
	
	layoutPrefs.forEach(key => {
		const val = opts[key];
		if (val === undefined || val === null) return;

		const item = document.createElement('div');
		item.className = 'panel-field';
		
		const label = document.createElement('label');
		label.textContent = key.replace('preferences.', '').replace('css.', '').replace(/([A-Z])/g, ' $1').replace(/\./g, ' › ').replace(/-/g, ' ');
		item.appendChild(label);

		let type = typeof val === 'number' ? 'number' : 'text';
		if (key.endsWith('-rgb') || key.endsWith('-color')) type = 'color';

		if (typeof val === 'boolean') {
			const input = document.createElement('input');
			input.type = 'checkbox';
			input.checked = val;
			input.addEventListener('change', () => {
				opts[key] = input.checked;
				broadcast(key, input.checked);
				syncAdvancedEditor();
			});
			item.appendChild(input);
		} else {
			const input = document.createElement('input');
			input.type = type;
			
			// Initialize color val to hex
			if (type === 'color') {
				const strVal = String(val).trim();
				if (strVal.match(/^[0-9]+(\s*,\s*[0-9]+){2}$/)) {
					const rgb = strVal.split(',').map(n => parseInt(n.trim()).toString(16).padStart(2, '0'));
					input.value = `#${rgb.join('')}`;
				} else {
					input.value = strVal;
				}
			} else {
				input.value = val;
			}

			input.addEventListener('input', () => {
				let finalVal = input.value;
				if (type === 'color' && finalVal.startsWith('#')) {
					const h = finalVal.replace('#', '');
					finalVal = `${parseInt(h.substr(0, 2), 16)}, ${parseInt(h.substr(2, 2), 16)}, ${parseInt(h.substr(4, 2), 16)}`;
				}
				opts[key] = type === 'number' ? parseFloat(finalVal) : finalVal;
				broadcast(key, opts[key]);
				syncAdvancedEditor();
			});
			item.appendChild(input);
		}
		container.appendChild(item);
	});
}

/* ═══════════════  Presets Logic  ═══════════════ */
let presets = [];

async function initPresets() {
	try {
		const res = await fetch('/config/layout-presets');
		presets = await res.json();
		
		// If no presets, add an example Wingman preset
		if (presets.length === 0) {
			const wingmanPreset = {
				id: 'wingman-default',
				name: 'Wingman (Example)',
				values: {
					'css.lan66-sidebar-bottom': '18.00rem',
					'css.lan66-sidebar-scale-x': '0.600',
					'css.lan66-sidebar-scale-y': '0.800',
					'css.lan66-focused-player-bottom': '1.50rem'
				}
			};
			presets.push(wingmanPreset);
		}
		
		renderPresetsSelect();
	} catch (err) { console.error('Error fetching presets:', err); }
}

function renderPresetsSelect() {
	const sel = document.getElementById('preset-select');
	sel.innerHTML = '<option value="">— Current —</option>';
	presets.forEach(p => {
		const opt = document.createElement('option');
		opt.value = p.id;
		opt.textContent = p.name;
		sel.appendChild(opt);
	});
}

async function loadPreset(id) {
	const p = presets.find(x => x.id === id);
	if (!p) return;
	
	// Apply settings from preset
	for (const [key, val] of Object.entries(p.values)) {
		opts[key] = val;
	}

	// Force default scene so the layout is visible
	opts['match.activeScene'] = 'default';

	// Re-build or re-initialize logic
	computeRemPx();
	// For simplicity, we can just update existing elements if their DEFS match
	els.forEach(el => {
		const scaleX = el.def.scaleKeys ? resolveNum(el.def.scaleKeys.x, 1) : 1;
		const scaleY = el.def.scaleKeys ? resolveNum(el.def.scaleKeys.y, 1) : 1;
		let bw = el.def.baseW, bh = el.def.baseH;

		if (el.def.sizeKey === 'css.radar-width') { bw = resolvePctOrRem('css.radar-width', VP_W, el.def.baseW); bh = bw; }
		if (el.def.sizeKey === 'css.lan66-event-badge-width') { bw = resolvePctOrRem('css.lan66-event-badge-width', VP_W, el.def.baseW); }
		if (el.def.sizeKey === 'css.lan66-current-map-width') { bw = resolvePctOrRem('css.lan66-current-map-width', VP_W, el.def.baseW); bh = bw * 9 / 16; }

		if (el.def.id.startsWith('sponsor-')) {
			bw = resolvePctOrRem('css.sponsor-panel-width', VP_W, 120);
			bh = resolvePctOrRem('css.sponsor-panel-height', VP_H, 45);
		}

		el.baseW = bw; el.baseH = bh; el.scaleX = scaleX; el.scaleY = scaleY;
		el.w = bw * scaleX; el.h = bh * scaleY;

		for (const prop of el.def.props) {
			const refSize = (prop.edge === 'top' || prop.edge === 'bottom') ? VP_H : VP_W;
			const fb = (prop.edge === 'top' || prop.edge === 'bottom') ? 11 : 20; // 1.15rem -> ~11px on 1080p
			positions[prop.edge] = evaluateCss(opts[prop.key], refSize, fb);
		}

		if (el.def.anchor.v === 'top') el.top = positions.top ?? 0;
		else el.top = VP_H - (positions.bottom ?? 0) - el.h;
		
		if (el.def.anchor.h === 'left') el.left = positions.left ?? 0;
		else if (el.def.anchor.h === 'right') el.left = VP_W - (positions.right ?? 0) - el.w;
		else el.left = (VP_W - el.w) / 2;

		positionEl(el);
	});
	updatePanel();
	updateLayerList();

	// Auto-save
	await save();

	// Broadcast everything in preset (for Ghost-Sync)
	if (p.values) {
		for (const [key, val] of Object.entries(p.values)) {
			broadcast(key, val);
		}
	}
	broadcast('match.activeScene', 'default');
}

async function saveNewPreset() {
	const name = prompt('Preset Name:');
	if (!name) return;

	const values = {};
	for (const el of els) {
		if (el.def.readonly) continue;
		Object.assign(values, getConfigValues(el));
		if (el.def.scaleKeys) {
			values[el.def.scaleKeys.x] = el.scaleX.toFixed(3);
			values[el.def.scaleKeys.y] = el.scaleY.toFixed(3);
		}
		if (el.def.sizeKey === 'css.radar-width') values['css.radar-width'] = (el.w / VP_W * 100).toFixed(1) + '%';
		if (el.def.sizeKey === 'css.lan66-event-badge-width') values['css.lan66-event-badge-width'] = pxToRem(el.w).toFixed(2) + 'rem';
		if (el.def.sizeKey === 'css.lan66-current-map-width') values['css.lan66-current-map-width'] = pxToRem(el.w).toFixed(2) + 'rem';
	}

	try {
		const res = await fetch('/config/layout-presets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, values })
		});
		const preset = await res.json();
		presets.push(preset);
		renderPresetsSelect();
		document.getElementById('preset-select').value = preset.id;
	} catch (err) { console.error('Error saving preset:', err); }
}

async function renameSelectedPreset() {
	const id = document.getElementById('preset-select').value;
	if (!id) return;
	const preset = presets.find(p => p.id === id);
	const newName = prompt('New Name:', preset.name);
	if (!newName || newName === preset.name) return;

	try {
		await fetch(`/config/layout-presets/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newName })
		});
		preset.name = newName;
		renderPresetsSelect();
		document.getElementById('preset-select').value = id;
	} catch (err) { console.error('Error renaming preset:', err); }
}

async function deleteSelectedPreset() {
	const id = document.getElementById('preset-select').value;
	if (!id) return;
	if (!confirm('Are you sure you want to delete this preset?')) return;

	try {
		await fetch(`/config/layout-presets/${id}`, { method: 'DELETE' });
		presets = presets.filter(p => p.id !== id);
		renderPresetsSelect();
	} catch (err) { console.error('Error deleting preset:', err); }
}

function exportPresets() {
	const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `eon-hud-presets-${new Date().toISOString().slice(0,10)}.json`;
	a.click();
}

async function importPresets(e) {
	const file = e.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = async (event) => {
		try {
			const imported = JSON.parse(event.target.result);
			if (!Array.isArray(imported)) return;
			// For each imported preset, we'll save it to the server
			for (const p of imported) {
				const res = await fetch('/config/layout-presets', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: p.name, values: p.values })
				});
				const saved = await res.json();
				presets.push(saved);
			}
			renderPresetsSelect();
			alert('Presets imported successfully!');
		} catch (err) { console.error('Error importing:', err); alert('Invalid presets file.'); }
	};
	reader.readAsText(file);
}

function syncSidebarScale(changed) {
	const other = els.find(x => x.def.id === (changed.def.id === 'sidebar-left' ? 'sidebar-right' : 'sidebar-left'));
	if (!other) return;
	const oldW = other.w, oldH = other.h;
	other.scaleX = changed.scaleX; other.scaleY = changed.scaleY;
	other.w = other.baseW * other.scaleX; other.h = other.baseH * other.scaleY;
	if (other.def.anchor.h === 'right') other.left += (oldW - other.w);
	if (other.def.anchor.v === 'bottom') other.top += (oldH - other.h);
	positionEl(other);
}

/* ═══════════════  Selection & Panel  ═══════════════ */
function selectEl(id) {
	selectedId = id;
	els.forEach(el => el.dom.classList.toggle('--selected', el.def.id === id));
	updatePanel();
	updateLayerList();
}

function updatePanel() {
	const panel = document.getElementById('panel-content');
	const el = els.find(x => x.def.id === selectedId);
	if (!el) { panel.innerHTML = '<p class="panel-hint">Click an element to edit.<br><br><span style="font-size:11px">Arrow keys: nudge 1px<br>Shift+Arrow: nudge 10px<br>Ctrl+S: save</span></p>'; return; }
	const def = el.def, values = getConfigValues(el);

	let html = `<div class="panel-title"><span class="panel-color" style="background:${def.border}"></span>${def.label}</div>`;

	if (def.readonly) {
		html += '<p style="font-size:11px;color:var(--text-dim);">This element is positioned by viewport margin settings and is view-only in the layout editor.</p>';
		panel.innerHTML = html; return;
	}

	html += '<div class="panel-section"><div class="panel-section-title">Position</div><div class="panel-field-row">';
	for (const p of def.props) html += `<div class="panel-field"><label>${p.edge}</label><input type="text" data-key="${p.key}" data-type="pos" value="${values[p.key]}"></div>`;
	html += '</div></div>';

	if (def.scaleKeys) {
		html += '<div class="panel-section"><div class="panel-section-title">Scale</div><div class="panel-field-row">';
		html += `<div class="panel-field"><label>X</label><input type="text" data-key="${def.scaleKeys.x}" data-type="scale" value="${el.scaleX.toFixed(3)}"></div>`;
		html += `<div class="panel-field"><label>Y</label><input type="text" data-key="${def.scaleKeys.y}" data-type="scale" value="${el.scaleY.toFixed(3)}"></div>`;
		html += '</div></div>';
	}

	if (def.sizeKey) {
		html += '<div class="panel-section"><div class="panel-section-title">Size</div>';
		if (def.sizeKey === 'css.radar-width') {
			html += `<div class="panel-field"><label>Width (%)</label><input type="text" data-key="${def.sizeKey}" data-type="radar-size" value="${(el.w / VP_W * 100).toFixed(1)}%"></div>`;
		} else {
			html += `<div class="panel-field"><label>Width</label><input type="text" data-key="${def.sizeKey}" data-type="badge-size" value="${pxToRem(el.w).toFixed(2)}rem"></div>`;
		}
		html += '</div>';
	}

	html += `<div class="panel-section"><div class="panel-section-title">Pixels</div><p style="font-size:11px;color:var(--text-dim)">x: ${Math.round(el.left)} · y: ${Math.round(el.top)}<br>w: ${Math.round(el.w)} · h: ${Math.round(el.h)}</p></div>`;
	panel.innerHTML = html;
	panel.querySelectorAll('input').forEach(input => input.addEventListener('change', () => applyPanelInput(input)));
}

function applyPanelInput(input) {
	const el = els.find(x => x.def.id === selectedId); if (!el) return;
	const key = input.dataset.key, type = input.dataset.type, raw = input.value.trim();
	if (type === 'scale') {
		const v = parseFloat(raw); if (isNaN(v) || v <= 0) return;
		if (key.endsWith('scale-x')) { el.scaleX = v; el.w = el.baseW * v; } else { el.scaleY = v; el.h = el.baseH * v; }
		if (el.def.anchor.h === 'right') el.left = VP_W - el.w - remToPx(resolveToRem('css.lan66-sidebar-right', 2));
		if (el.def.anchor.v === 'bottom') el.top = VP_H - el.h - remToPx(resolveToRem('css.lan66-sidebar-bottom', 1.5));
		syncSidebarScale(el); positionEl(el); updatePanel(); return;
	}
	if (type === 'radar-size') {
		let pct = parseFloat(raw); if (isNaN(pct) || pct <= 0) return;
		const px = Math.max(5, Math.min(pct, 60)) / 100 * VP_W;
		el.w = px; el.h = px; el.baseW = px; el.baseH = px;
		positionEl(el); updatePanel(); return;
	}
	if (type === 'badge-size') {
		let rem; const m = raw.match(/^([\d.]+)\s*rem$/);
		rem = m ? parseFloat(m[1]) : parseFloat(raw); if (isNaN(rem)) return;
		el.w = remToPx(rem); el.baseW = el.w;
		positionEl(el); updatePanel(); return;
	}
	let remVal; const m = raw.match(/^([\d.]+)\s*rem$/);
	remVal = m ? parseFloat(m[1]) : parseFloat(raw); if (isNaN(remVal)) return;
	const px = remToPx(remVal), prop = el.def.props.find(p => p.key === key); if (!prop) return;
	if (prop.edge === 'top') el.top = px; else if (prop.edge === 'left') el.left = px;
	else if (prop.edge === 'bottom') el.top = VP_H - px - el.h; else if (prop.edge === 'right') el.left = VP_W - px - el.w;
	positionEl(el); updatePanel();
}

function getConfigValues(el) {
	const out = {};
	for (const p of el.def.props) {
		let px;
		if (p.edge === 'top') px = el.top; else if (p.edge === 'left') px = el.left;
		else if (p.edge === 'bottom') px = VP_H - el.top - el.h; else if (p.edge === 'right') px = VP_W - el.left - el.w;
		out[p.key] = pxToRem(px).toFixed(2) + 'rem';
	}
	out[`css.lan66-${el.def.id}-display`] = el.visible ? '' : 'none';
	return out;
}

function toggleVisibility(el) {
	el.visible = !el.visible;
	positionEl(el);
	updateLayerList();
}

/* ═══════════════  Save  ═══════════════ */
async function save() {
	const status = document.getElementById('save-status');
	status.textContent = 'Saving…';
	
	// Collect changes from visual elements
	const changes = {};
	for (const el of els) {
		if (el.def.readonly) continue;
		Object.assign(changes, getConfigValues(el));
		if (el.def.scaleKeys) {
			changes[el.def.scaleKeys.x] = el.scaleX.toFixed(3);
			changes[el.def.scaleKeys.y] = el.scaleY.toFixed(3);
		}
		if (el.def.sizeKey === 'css.radar-width') changes['css.radar-width'] = (el.w / VP_W * 100).toFixed(1) + '%';
		if (el.def.sizeKey === 'css.lan66-event-badge-width') changes['css.lan66-event-badge-width'] = pxToRem(el.w).toFixed(2) + 'rem';
		if (el.def.sizeKey === 'css.lan66-current-map-width') changes['css.lan66-current-map-width'] = pxToRem(el.w).toFixed(2) + 'rem';
	}
	
	// Merge with all other layout-related opts (from advanced/settings views)
	const finalPayload = { ...changes };
	if (opts.theme) finalPayload.theme = opts.theme;

	Object.keys(opts).forEach(k => {
		if (k.startsWith('css.') || k.startsWith('preferences.') || k.startsWith('series.name.') || k.startsWith('promotion.') || k.startsWith('sponsors.')) {
			finalPayload[k] = opts[k];
		}
	});

	try {
		await fetch('/config/options', { 
			method: 'PUT', 
			headers: { 'Content-Type': 'application/json' }, 
			body: JSON.stringify(finalPayload) 
		});
		
		if (opts.theme && opts.theme !== initialTheme) {
			window.location.reload();
			return;
		}

		await fetch('/config/force-hud-refresh', { method: 'POST' });
		status.textContent = 'Saved ✓';
		setTimeout(() => { if (status.textContent === 'Saved ✓') status.textContent = ''; }, 2500);
	} catch (err) { status.textContent = 'Error!'; console.error(err); }
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
})();
