# Raspi Server - Pi Dashboard

A self-hosted home server dashboard running on a Raspberry Pi 4, accessible via Tailscale. Runs as a Docker container that starts with the Pi.

## Features

- **System Monitoring**: CPU, load, RAM, disk, temperature, uptime
- **Docker auto-discovery**: every container shows up automatically, with a link to its web UI if it has one
- **Host services**: native Pi services (qBittorrent, Syncthing) and remote ones on rocky (Jellyfin, qBittorrent) probed for up/down, latency and version
- **Tailscale**: every device on the tailnet — online/offline, direct vs relay, endpoint, traffic, last seen, exit nodes
- **Syncthing**: status of the `Albyte (Obsidian)` folder and each peer device's connection and sync completion
- **Humidors**: Govee H5xxx sensors from Home Assistant, found automatically — humidity, temperature, battery, 24h humidity trend against the target band, and a status (in range / drying out / running wet / too warm / no recent data). Ranges are set with `HUMIDOR_*` in `.env`
- **Home Assistant**: monitor and toggle HA entities
- **Real-time Updates**: polls every 10 seconds

## Running it (on the Pi)

```bash
cd ~/LocalGit/raspi-server
docker compose up -d --build
```

Dashboard: `http://raspi:3001`

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

Links are built from the hostname you opened the dashboard with, so they work via `raspi`, the LAN IP, or the Tailscale IP.

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

- `GET /api/status` - Returns all dashboard data
- `POST /api/ha/service` - Proxy for Home Assistant service calls
- `GET /api/health` - Container healthcheck

## License

MIT License
