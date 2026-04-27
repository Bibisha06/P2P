# P2P Mesh Network Visualizer

A real-time, self-healing peer-to-peer mesh network visualizer built with WebRTC, D3.js, and React.

Open this in multiple browser tabs. They find each other, form a network, pick the smartest way to connect, and heal themselves if any tab dies.

## Architecture

```
server.js                    ← Signaling server (WebSocket, port 8080)
src/
├── algorithms/              ← Pure DAA logic (no React, no side effects)
│   ├── GraphUtils.js        ← Adjacency list, BFS traversal, connectivity
│   ├── TopologySelector.js  ← Decision boundary classifier
│   ├── FullMesh.js          ← Complete graph K_N, O(N²)
│   ├── Ring.js              ← Sorted ring, O(N log N)
│   ├── Star.js              ← Greedy hub election, O(N)
│   └── BFSHealer.js         ← BFS reachability + minimum reconnect
├── network/                 ← WebRTC + WebSocket (no React)
│   ├── SignalingClient.js   ← WebSocket to signaling server
│   ├── PeerManager.js       ← RTCPeerConnection lifecycle
│   └── LatencyTracker.js    ← Ping/pong, memoized RTT table
├── components/              ← React UI
│   ├── MeshGraph.jsx        ← D3 force-directed graph (fullscreen)
│   ├── TopologyBanner.jsx   ← Top: algorithm name + reasoning
│   ├── StatsPanel.jsx       ← Bottom-left: stats + latency map
│   ├── EventLog.jsx         ← Bottom-right: last 8 events
│   └── ControlsPanel.jsx    ← Right: sliders, toggles, buttons
├── hooks/
│   └── useNetwork.js        ← Bridges network layer → React state
├── styles/
│   └── index.css            ← Dark theme, glows, animations
├── App.jsx                  ← Root layout
└── main.jsx                 ← Entry point
```

## Algorithms Used

| Algorithm | Where | Complexity |
|---|---|---|
| Graph Theory | Entire network modeled as G = (V, E) | — |
| Greedy | Star hub election — lowest avg RTT | O(N) |
| Memoization / DP | Rolling-average latency cache per peer | O(1) lookup |
| BFS | Self-healing reachability check | O(V + E) |
| Comparison Sort | Ring topology — lexicographic peer sort | O(N log N) |
| Decision Boundary | Topology classifier (peer count + latency) | O(1) |

## Quick Start

```bash
# Install dependencies
npm install

# Start the signaling server (terminal 1)
node server.js

# Start the Vite dev server (terminal 2)
npm run dev

# Open http://localhost:5173 in 4+ browser tabs
```

## How It Works

1. Each tab connects to the signaling server via WebSocket and gets a UUID
2. Peers establish direct WebRTC data channels to every other peer
3. Latency is measured via ping/pong every second (configurable)
4. Every 3 seconds, each peer evaluates the network and selects a topology:
   - **≤3 peers** → Full Mesh (complete graph K_N)
   - **4–7 peers** → Ring (sorted cycle)
   - **8+ peers** → Star (greedy hub election)
5. When a peer dies, BFS detects unreachable nodes and heals the topology
6. Everything is visualized live with D3 force-directed graph
