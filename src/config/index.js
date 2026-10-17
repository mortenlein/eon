import * as Vue from '/dependencies/vue.js'
import { loadModule } from '/dependencies/vue3-sfc-loader.js'
import { sfcLoaderOptions } from '/dependencies/vue3-sfc-loader-options.js'
import { eonToken } from '/config/control-token.js'

// Opened from another machine (eon bound to 0.0.0.0): the server only accepts changes that
// carry the control token, so put it on every same-origin request. Loopback needs none.
if (eonToken) {
	const nativeFetch = window.fetch.bind(window)
	window.fetch = (input, init = {}) => {
		const url = new URL(input instanceof Request ? input.url : input, window.location.href)
		if (url.origin !== window.location.origin) return nativeFetch(input, init)
		const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined))
		headers.set('X-Eon-Token', eonToken)
		return nativeFetch(input, { ...init, headers })
	}
}

const app = Vue.createApp(
	Vue.defineAsyncComponent(() => loadModule('/config/App.vue', sfcLoaderOptions)),
)

app.mount('#app')
