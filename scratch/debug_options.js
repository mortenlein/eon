import { getSettings } from '../src/server/settings.js'

async function check() {
    try {
        const { settings } = await getSettings();
        console.log('--- ALL SETTINGS ---');
        console.log(JSON.stringify(settings, null, 2));
        
        const optionsCache = Object.fromEntries(
            Object.entries(settings.options || {}).map(([key, opt]) => {
                if (typeof opt === 'object' && opt !== null) {
                    return [key, opt.value ?? opt.fallback];
                }
                return [key, opt];
            })
        );
        console.log('--- OPTIONS CACHE ---');
        console.log(JSON.stringify(optionsCache, null, 2));
    } catch (e) {
        console.error(e);
    }
}

check();
