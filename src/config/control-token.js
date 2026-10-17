// The control token for remote use: from ?token= on the config URL, kept for this tab so
// in-app navigation without the query string keeps working. Storage can throw (private
// windows, blocked site data) - then only the URL counts.
const fromUrl = new URL(window.location.href).searchParams.get('token')

const remember = () => {
	try {
		if (fromUrl) sessionStorage.setItem('eon.controlToken', fromUrl)
		return fromUrl || sessionStorage.getItem('eon.controlToken')
	} catch {
		return fromUrl
	}
}

export const eonToken = remember() || null
