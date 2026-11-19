const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Simulated High-Speed Telemetry Queue (Redis-style buffer before DB flush)
let telemetryQueue = [];
const activeFleet = new Map([
  ['TRK-101', { id: 'TRK-101', driver: 'A. Patel', route: 'Surat -> Mumbai', lat: 21.1702, lng: 72.8311, speed: 68, status: 'EN_ROUTE' }],
  ['TRK-104', { id: 'TRK-104', driver: 'R. Mehta', route: 'Vadodara -> Ahmedabad', lat: 22.3072, lng: 73.1812, speed: 74, status: 'EN_ROUTE' }],
  ['TRK-109', { id: 'TRK-109', driver: 'K. Shah', route: 'Vapi -> Surat', lat: 20.3893, lng: 72.9106, speed: 0, status: 'IDLE' }]
]);

// Batch Worker: Flushes queued GPS coordinates every 5 seconds to prevent DB lockups
setInterval(() => {
  if (telemetryQueue.length > 0) {
    console.log(`[BatchWorker] Flushed ${telemetryQueue.length} GPS packets to primary storage.`);
    telemetryQueue = [];
  }
}, 5000);

// REST API: Fetch current fleet snapshot
app.get('/api/fleet', (req, res) => {
  res.json(Array.from(activeFleet.values()));
});

// WebSocket Gateway: Real-time driver telemetry ingestion & dispatcher broadcast
io.on('connection', (socket) => {
  console.log(`[Gateway] Client connected: ${socket.id}`);
  socket.emit('fleetSnapshot', Array.from(activeFleet.values()));

  socket.on('sendLocation', (payload) => {
    const vehicle = activeFleet.get(payload.vehicleId);
    if (!vehicle) return;

    vehicle.lat = Number(payload.lat.toFixed(4));
    vehicle.lng = Number(payload.lng.toFixed(4));
    vehicle.speed = payload.speed;
    vehicle.status = payload.speed > 0 ? 'EN_ROUTE' : 'IDLE';
    vehicle.updatedAt = new Date().toISOString();

    // Buffer packet in queue instead of writing synchronously
    telemetryQueue.push({ ...payload, receivedAt: Date.now() });

    // Broadcast live coordinate update to all connected dispatchers
    io.emit('locationUpdated', vehicle);
  });

  socket.on('disconnect', () => {
    console.log(`[Gateway] Client disconnected: ${socket.id}`);
  });
});

// Dispatcher Dashboard UI
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LogiTrack Pro — Real-Time Fleet Telemetry</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0D1117; color: #E6EDF3; margin: 0; padding: 32px; }
    .container { max-width: 900px; margin: auto; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363D; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 22px; margin: 0; }
    .pill { font-family: monospace; font-size: 12px; background: #1f6feb33; color: #58a6ff; padding: 4px 10px; border-radius: 12px; }
    .card { background: #161B22; border: 1px solid #30363D; border-radius: 6px; padding: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #30363D; font-size: 14px; }
    th { color: #8B949E; font-size: 12px; text-transform: uppercase; }
    .status-active { color: #3fb950; font-weight: 600; font-family: monospace; }
    .status-idle { color: #d29922; font-weight: 600; font-family: monospace; }
    button { background: #238636; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    button:hover { background: #2ea043; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>LogiTrack Pro // Fleet Telemetry Gateway</h1>
        <p style="color:#8B949E; font-size:13px; margin:4px 0 0;">WebSocket Stream + Buffered Queue Architecture</p>
      </div>
      <span class="pill" id="connStatus">SOCKET: CONNECTING...</span>
    </header>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0; font-size:16px;">Live Fleet Stream</h3>
        <button onclick="simulateGPS()">Simulate GPS Ping</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Vehicle ID</th>
            <th>Driver</th>
            <th>Route</th>
            <th>Coordinates</th>
            <th>Speed</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody id="fleetBody"></tbody>
      </table>
    </div>
  </div>

  <script>
    const socket = io();
    const fleet = new Map();

    socket.on('connect', () => {
      document.getElementById('connStatus').textContent = 'SOCKET: LIVE';
    });

    socket.on('fleetSnapshot', (vehicles) => {
      vehicles.forEach(v => fleet.set(v.id, v));
      renderTable();
    });

    socket.on('locationUpdated', (vehicle) => {
      fleet.set(vehicle.id, vehicle);
      renderTable();
    });

    function renderTable() {
      const tbody = document.getElementById('fleetBody');
      tbody.innerHTML = Array.from(fleet.values()).map(v => \`
        <tr>
          <td><strong>\${v.id}</strong></td>
          <td>\${v.driver}</td>
          <td>\${v.route}</td>
          <td style="font-family:monospace;">\${v.lat}, \${v.lng}</td>
          <td>\${v.speed} km/h</td>
          <td><span class="\${v.status === 'EN_ROUTE' ? 'status-active' : 'status-idle'}">\${v.status}</span></td>
        </tr>
      \`).join('');
    }

    function simulateGPS() {
      const ids = Array.from(fleet.keys());
      const randomId = ids[Math.floor(Math.random() * ids.length)];
      const current = fleet.get(randomId);
      socket.emit('sendLocation', {
        vehicleId: randomId,
        lat: current.lat + (Math.random() * 0.01 - 0.005),
        lng: current.lng + (Math.random() * 0.01 - 0.005),
        speed: Math.floor(Math.random() * 40) + 45
      });
    }
  </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log(\`LogiTrack Pro running at http://localhost:\${PORT}\`);
});