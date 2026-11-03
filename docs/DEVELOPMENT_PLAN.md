# Pi Dashboard — Project Plan

## Overview

A self-hosted home server dashboard running on a Raspberry Pi 4, accessible via Tailscale. Displays real-time system stats, Docker container status, Home Assistant device states/controls, network info, and quick links to hosted services.

---

## Stack

- **Backend**: Node.js + Express
- **Frontend**: React (Vite)
- **Deployment**: Systemd service (backend) + served as static build, or single Docker container
- **Auth**: None — Tailscale is the network perimeter
- **Config**: `.env` file for secrets (HA token, service URLs)

---

## Project Structure

```
pi-dashboard/
├── server/
│   ├── index.js
│   ├── routes/
│   │   └── status.js          # Aggregates all data into one endpoint
│   └── services/
│       ├── system.js          # CPU, RAM, disk, temp
│       ├── docker.js          # Container status via dockerode
│       ├── homeassistant.js   # HA REST API wrapper
│       └── network.js         # Tailscale status + local IP
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── SystemStats.jsx
│   │   │   ├── DockerStatus.jsx
│   │   │   ├── HAWidget.jsx
│   │   │   ├── NetworkInfo.jsx
│   │   │   └── QuickLinks.jsx
│   │   └── hooks/
│   │       └── useDashboard.js  # Polling hook
├── .env
├── .env.example
└── package.json
```

---

## Backend

### API Endpoints

#### `GET /api/status`
Returns all dashboard data in a single payload. Frontend polls this every 10 seconds.

```json
{
  "system": {
    "cpu": 12.4,
    "ram": { "used": 1.2, "total": 4.0, "percent": 30 },
    "disk": { "used": 18, "total": 64, "percent": 28 },
    "temp": 52.1,
    "uptime": 432000
  },
  "docker": [
    { "name": "homeassistant", "status": "running", "state": "healthy" }
  ],
  "network": {
    "tailscaleIp": "100.x.y.z",
    "tailscaleStatus": "connected",
    "localIp": "192.168.x.y"
  },
  "homeassistant": {
    "reachable": true,
    "states": [
      { "entity_id": "light.living_room", "state": "on", "attributes": {} }
    ]
  }
}
```

#### `POST /api/ha/service`
Proxies a Home Assistant service call (for controls in the UI).

```json
{
  "domain": "light",
  "service": "turn_off",
  "entity_id": "light.living_room"
}
```

---

### Service Implementation Notes

#### `services/system.js`
- Use the `systeminformation` npm package for CPU, RAM, disk
- Read CPU temp from `/sys/class/thermal/thermal_zone0/temp` (divide by 1000 for °C)
- Use `os.uptime()` for uptime

#### `services/docker.js`
- Use `dockerode` npm package
- Connect via `/var/run/docker.sock`
- Return name, status, state for each container
- The process user (`alby`) must be in the `docker` group

#### `services/homeassistant.js`
- Base URL: `http://localhost:8123` (same host, host network)
- Auth header: `Authorization: Bearer <LONG_LIVED_TOKEN>`
- `GET /api/states` for all entity states
- `POST /api/services/{domain}/{service}` for controls
- Wrap in try/catch — return `{ reachable: false }` if HA is down

#### `services/network.js`
- Shell out to `tailscale status --json` using `child_process.exec`
- Parse JSON output for IP and peer status
- Use `systeminformation.networkInterfaces()` for local IP (filter for `eth0`)

---

## Frontend

### Design Direction

Dark theme. Industrial/utilitarian aesthetic — this is a server dashboard, it should feel like a control panel. Think: monospaced fonts for stats, tight information density, subtle grid lines, muted base with bright accent for status indicators (green = healthy, amber = warning, red = down).

Font pairing suggestion:
- Stats/data: `JetBrains Mono` or `IBM Plex Mono`
- Labels/UI: `IBM Plex Sans` or similar

Avoid: generic purple gradients, card-heavy layouts that feel like a SaaS dashboard template.

### Widgets

#### System Stats
- CPU usage — bar or radial gauge
- RAM — used / total with percentage bar
- Disk — used / total with percentage bar
- CPU temp — colour coded (green < 60°C, amber 60–75°C, red > 75°C)
- Uptime — formatted as `Xd Xh Xm`

#### Docker Containers
- List of containers with name + status pill
- Green = running/healthy, red = stopped/error, amber = starting

#### Home Assistant
- List of entity states pulled from `/api/states`
- Filter to a configurable list of `entity_ids` (not all entities — HA has hundreds)
- Toggle controls for lights/switches via `POST /api/ha/service`
- Show HA reachability status

#### Network Info
- Tailscale IP + connection status
- Local IP (eth0)
- Pi hostname

#### Quick Links
- Hardcoded in config — list of `{ label, url, icon? }`
- Example entries: Home Assistant (`http://100.x.x.x:8123`), code-server (`http://100.x.x.x:8080`)

### Data Fetching

Use a single `useDashboard` hook that polls `GET /api/status` every 10 seconds:
- Store last-known data so UI doesn't blank out on a failed poll
- Show a subtle "last updated X seconds ago" indicator
- Mark widgets as stale if poll fails 3+ times

---

## Environment Variables

```env
# .env
HA_BASE_URL=http://localhost:8123
HA_TOKEN=your_long_lived_token_here
HA_ENTITY_IDS=light.living_room,switch.fan,binary_sensor.front_door

PORT=3001
```

Generate the HA token: Home Assistant → Profile → Security → Long-Lived Access Tokens.

---

## Deployment

### Systemd (recommended for simplicity)

Build the React frontend and serve it as static files from the Express backend.

```bash
# In client/
npm run build
# Copy dist/ into server/public/
# Express serves static from public/ and API from /api/*
```

Create `/etc/systemd/system/pi-dashboard.service`:

```ini
[Unit]
Description=Pi Dashboard
After=network.target

[Service]
User=alby
WorkingDirectory=/home/alby/pi-dashboard/server
ExecStart=/usr/bin/node index.js
Restart=always
EnvironmentFile=/home/alby/pi-dashboard/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pi-dashboard
sudo systemctl start pi-dashboard
```

Dashboard available at `http://<tailscale-ip>:3001`.

## Dependencies

```json
// server
"express": "^4.x",
"systeminformation": "^5.x",
"dockerode": "^4.x",
"node-fetch": "^3.x",
"dotenv": "^16.x"

// client
"react": "^18.x",
"vite": "^5.x"
```

---

## Out of Scope (for now)

- Authentication / login wall
- Samba / NAS widgets (planned for later)
- Notifications or alerting
- Historical graphs (could add later with a lightweight time-series store)
- Mobile-specific layout (responsive is fine, but not a priority)