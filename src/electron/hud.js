const { app, BrowserWindow, globalShortcut, screen } = require('electron')

app.on('ready', () => {
	const primaryDisplay = screen.getPrimaryDisplay()
	const { x, y, width, height } = primaryDisplay.bounds

	const browserWindow = new BrowserWindow({
		alwaysOnTop: true,
		backgroundColor: '#00000000',
		focusable: false,
		transparent: true,
		frame: false,
		fullscreen: false,
		fullscreenable: false,
		hasShadow: false,
		resizable: false,
		show: false,
		skipTaskbar: true,
		x,
		y,
		width,
		height,
		webPreferences: {
			backgroundThrottling: false,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	})

	browserWindow.setIgnoreMouseEvents(true)
	browserWindow.setAlwaysOnTop(true, 'screen-saver')
	browserWindow.once('ready-to-show', () => {
		browserWindow.showInactive()
	})
	browserWindow.loadURL(`http://${process.env.HOST || 'localhost'}:${process.env.PORT || 31982}/hud?transparent&corners&hudonly`)
	browserWindow.on('closed', () => app.quit())

	// The window can't be clicked or closed, so give the operator keys for it:
	// Ctrl+Shift+F12 hides/shows the overlay (to see the desktop), Ctrl+Shift+Alt+F12 quits it.
	globalShortcut.register('CommandOrControl+Shift+F12', () => {
		if (browserWindow.isVisible()) browserWindow.hide()
		else browserWindow.showInactive()
	})
	globalShortcut.register('CommandOrControl+Shift+Alt+F12', () => app.quit())

	// This window has no frame, no taskbar entry and ignores the mouse, so nothing
	// can close it by hand. On Windows, closing the terminal behind `npm run overlay`
	// (or the console that spawned us) kills the parent but not us - so follow the
	// parent out. ESRCH = gone; EPERM still means it is alive.
	const parentPid = process.ppid
	setInterval(() => {
		try { process.kill(parentPid, 0) } catch (err) { if (err.code === 'ESRCH') app.quit() }
	}, 1000).unref()
})

app.on('will-quit', () => {
	globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
	app.quit()
})
