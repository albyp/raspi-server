# Raspi Server - Pi Dashboard

A self-hosted home server dashboard running on a Raspberry Pi 4, accessible via Tailscale. Runs as a Docker container that starts with the Pi.

## Features

- **System Monitoring**: CPU, load, RAM, disk, temperature, uptime
- **Docker auto-discovery**: every container shows up automatically, with a link to its web UI if it has one
- **Host services**: native Pi services (qBittorrent, Syncthing) and remote ones on rocky (Jellyfin, qBittorrent) probed for up/down, latency and version
- **Tailscale**: every device on the tailnet — online/offline, direct vs relay, endpoint, traffic, last seen, exit nodes
- **Syncthing**: status of the `Albyte (Obsidian)` folder and each peer device's connection and sync completion
- **Humidors**: Govee H5xxx sensors from Home Assistant, found automatically — humidity, temperature, battery, 24h humidity trend against the target band, and a status (in range / drying out / running wet / too warm / no recent data). Ranges are set with `HUMIDOR_*` in `.env`
- **Betbot**: armed state, bank, today's and since-arm P&L, open liability and recorder health from ~/betbot (its containers publish their page on the Pi's loopback only; it's proxied read-only at `/betbot/`). Arming stays a CLI command on the Pi
- **Home Assistant**: read-only view of selected HA entities (control devices in HA itself)
- **Real-time Updates**: polls every 10 seconds

## Running it (on the Pi)

```bash
cd ~/LocalGit/raspi-server
docker compose up -d --build
```

Dashboard: `https://raspi.tail6accbd.ts.net` (tailnet only, password login)

## Access and security

- The server listens on `127.0.0.1:3001` only. It is not reachable from the LAN.
- `tailscale serve` publishes it over HTTPS to the tailnet. This was set up once with `sudo tailscale serve --bg --https=443 http://127.0.0.1:3001` and persists across reboots. Check it with `tailscale serve status`.
- Old links such as `http://raspi:3001/betbot/` still work over the tailnet. `sudo tailscale serve --bg --http=3001 http://127.0.0.1:3002` sends them to a small redirect listener (`REDIRECT_PORT`), which returns a 301 to the same path on `PUBLIC_URL`. After login you land on the page you asked for.
- Every page and API route except `/api/health` needs a login. Set or change the password with `./set-password.sh` (12+ characters). It writes `DASHBOARD_PASSWORD_HASH` and `SESSION_SECRET` into `.env`, which must stay `chmod 600`. Sessions last 30 days. Delete `SESSION_SECRET` and re-run the script to log out every browser.
- Docker is read through `socket-proxy` (only listing containers is allowed). The dashboard never gets the raw Docker socket.
- The dashboard container runs as uid 1000 with a read-only filesystem and no capabilities. As non-root, the Tailscale LocalAPI only lets it read status.

The container uses `restart: unless-stopped`, and `docker.service` is enabled at boot, so it comes back on its own after a reboot. After pulling changes, rerun the same command to rebuild.

Logs: `docker logs -f raspi-dashboard`

## How Docker links are found

For each running container, in order:

1. `dashboard.url` label — `":8123"`, `"/admin"`, `":8080/ui"` or a full `http://…` URL
2. A built-in map of known images (Home Assistant → 8123, Pi-hole → `/admin`, …) — this is what covers `network_mode: host` containers, which publish no ports
3. Each published TCP port is probed; the first that answers with HTML or a redirect becomes the link

Other labels: `dashboard.name` (display name), `dashboard.hide: "true"` (leave it off the dashboard).

```yaml
labels:
  dashboard.url: ":8096/web/"
  dashboard.name: "Jellyfin"
```

Links are built from the hostname you opened the dashboard with (`raspi.tail6accbd.ts.net`), so they resolve over Tailscale.

## Non-docker services (`services.json`)

Native Pi services and services on other machines live in `services.json`. Hosts are resolved through Tailscale status first, then DNS. Edit it and `docker compose restart` — no rebuild needed.

`kind` adds extra details: `jellyfin` (version), `qbittorrent` (speeds/active torrents — needs `<AUTH>_USER` / `<AUTH>_PASS` in `.env` matching the service's `auth` field).

## Environment Variables

See `.env.example`. The Syncthing API key is read from the mounted Syncthing `config.xml`, so it doesn't need to be copied into `.env`.

## Development

```bash
cd server && npm install && npm start      # API on :3001
cd client && npm install && npm run dev    # Vite on :5173, proxies /api
```

Outside the container the server expects `/var/run/docker.sock`, `/var/run/tailscale/tailscaled.sock` and `SYNCTHING_CONFIG` (default `/syncthing/config.xml` — point it at `~/.local/state/syncthing/config.xml`).

## API Endpoints

- `GET /api/status` - Returns all dashboard data (login required)
- `GET /api/health` - Container healthcheck (no login)
- `GET /login`, `POST /login`, `POST /logout` - Session login

## License

MIT License
