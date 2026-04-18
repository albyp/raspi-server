# Raspi Server - Pi Dashboard

A self-hosted home server dashboard running on a Raspberry Pi 4, accessible via Tailscale. Displays real-time system stats, Docker container status, Home Assistant device states/controls, network info, and quick links to hosted services.

## Features

- **System Monitoring**: CPU usage, RAM, disk space, temperature, and uptime
- **Docker Integration**: View status of all running containers
- **Home Assistant Control**: Monitor and control HA entities
- **Network Info**: Tailscale and local IP addresses
- **Quick Links**: Easy access to hosted services
- **Dark Theme**: Industrial control panel aesthetic
- **Real-time Updates**: Polls data every 10 seconds

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **System Info**: systeminformation package
- **Docker**: dockerode package
- **Home Assistant**: REST API integration
- **Network**: Tailscale status + system network interfaces

## Project Structure

```
raspi-server/
├── server/                    # Express backend
│   ├── index.js              # Main server file
│   ├── routes/
│   │   └── status.js         # API endpoints
│   └── services/             # Data collection services
│       ├── system.js
│       ├── docker.js
│       ├── homeassistant.js
│       └── network.js
├── client/                   # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── .env                      # Environment variables
├── .env.example             # Environment template
└── docs/
    └── DEVELOPMENT_PLAN.md  # Detailed development plan
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- (On Raspberry Pi) Docker installed and user in docker group
- (On Raspberry Pi) Tailscale installed and connected

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd raspi-server
   ```

2. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../client
   npm install
   ```

4. Configure environment variables:
   ```bash
   cp ../.env.example ../.env
   # Edit .env with your Home Assistant token and settings
   ```

### Environment Variables

```env
# .env
HA_BASE_URL=http://localhost:8123
HA_TOKEN=your_long_lived_token_here
HA_ENTITY_IDS=light.living_room,switch.fan,binary_sensor.front_door

PORT=3001
```

### Development

1. Start the backend server:
   ```bash
   cd server
   npm start
   ```

2. Start the frontend development server:
   ```bash
   cd client
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

### Production Deployment

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

2. Copy the build to server public directory:
   ```bash
   cp -r dist ../server/public
   ```

3. Start the production server:
   ```bash
   cd server
   npm start
   ```

The dashboard will be available at `http://localhost:3001`

## API Endpoints

- `GET /api/status` - Returns all dashboard data
- `POST /api/ha/service` - Proxy for Home Assistant service calls

## Deployment on Raspberry Pi

See `docs/DEVELOPMENT_PLAN.md` for detailed systemd service setup and deployment instructions.

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Test on actual Raspberry Pi hardware when possible

## License

MIT License
