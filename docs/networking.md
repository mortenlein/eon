# Networking

You can override the default host binding (`127.0.0.1`) and the default port (`31982`).

If you change the port to one outside `ports.json`, you need to update the `uri` in `gamestate_integration_eon.cfg` to match.  
If you change the host binding, the HUD will accept connections from any device on the network.
This may not be a good idea, especially if people you don't trust are on the same network.

To bind to all hosts, set the host to `0.0.0.0`.


## Port fallback
`ports.json` lists the ports eon may use (`31982`, `31992`, `32002`). When the preferred port is one of them and cannot be bound (another process holds it, or Windows has reserved it), eon moves to the next candidate and logs `[eon] port 31982 unavailable (EADDRINUSE), trying 31992`. Only when every candidate fails does it exit with `[eon] cannot listen on ...`. A port outside the list is tried alone.

The port eon actually got is written to `tmp/eon-runtime.json` (`host`, `port`, `pid`, `startedAt`) and removed on a clean exit. eon-director reads it to find eon and to repoint the OBS browser sources.

Install every `gamestate_integration_eon*.cfg` (one per candidate) in CS2's `game/csgo/cfg`. CS2 posts to all of them and only the live one answers, so CS2 does not need a restart when eon moves.


## Environment Variables
You can set the environment variables `HOST` and `PORT`, for example:
```sh
HOST=0.0.0.0 PORT=3000 ./cs-hud-linux
```


## theme.json
You can set a `host` and `port` key in a `theme.json`, either in your `userspace` directory, or in a theme directory.
For example:
```json
{
	"parent": "default",
	"host": "0.0.0.0",
	"port": 3000
}
```
