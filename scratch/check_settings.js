import { getSettings } from './src/server/settings.js'
import { builtinRootDirectory } from './src/server/helpers/paths.js'

async function check() {
    try {
        const settings = await getSettings();
        console.log('Settings:', JSON.stringify(settings.settings, null, 2));
    } catch (e) {
        console.error(e);
    }
}

check();
