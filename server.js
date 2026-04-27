
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });


const peers = new Map();

function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const [, ws] of peers) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
        }
    }
}

wss.on('connection', (ws) => {
    const id = crypto.randomUUID();
    peers.set(id, ws);

    console.log(`[+] Peer connected: ${id} (${peers.size} total)`);

    
    ws.send(JSON.stringify({ type: 'welcome', id }));

    
    broadcast({ type: 'peer_list', peers: Array.from(peers.keys()) });

    ws.on('message', (raw) => {
        try {
            const data = JSON.parse(raw);

            
            if (data.target && peers.has(data.target)) {
                const envelope = { ...data, from: id };
                peers.get(data.target).send(JSON.stringify(envelope));
            }
        } catch (err) {
            console.error(`[!] Bad message from ${id}:`, err.message);
        }
    });

    ws.on('close', () => {
        peers.delete(id);
        console.log(`[-] Peer disconnected: ${id} (${peers.size} total)`);
        broadcast({ type: 'peer_list', peers: Array.from(peers.keys()) });
    });

    ws.on('error', (err) => {
        console.error(`[!] Socket error for ${id}:`, err.message);
    });
});

console.log(`\n🌐 Signaling server running on ws://localhost:${PORT}`);
console.log(`   Open index.html in 4+ browser tabs to start the mesh.\n`);
