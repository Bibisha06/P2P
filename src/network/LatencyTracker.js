
export class LatencyTracker {
  constructor(peerManager, options = {}) {
    this._listeners = {};
    this.peerManager = peerManager;
    this.pingInterval = options.pingInterval || 1000;
    this.packetLoss = options.packetLoss || false;
    this.maxSamples = 10;

    
    this.table = new Map();
    this._intervalId = null;

    
    peerManager.on('datachannel_message', (peerId, raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'ping') {
          
          peerManager.sendTo(peerId, JSON.stringify({ type: 'pong', ts: msg.ts }));
        } else if (msg.type === 'pong') {
          this._onPong(peerId, msg.ts);
        }
      } catch (e) {
        
      }
    });

    
    peerManager.on('peer_disconnected', (peerId) => {
      this.table.delete(peerId);
      this._emit('peer_invalidated', peerId);
    });
  }

  

  on(event, cb) {
    (this._listeners[event] ||= []).push(cb);
    return this;
  }

  _emit(event, ...args) {
    const arr = this._listeners[event];
    if (arr) arr.forEach(cb => cb(...args));
  }

  

  start() {
    this.stop();
    this._intervalId = setInterval(() => this._pingAll(), this.pingInterval);
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  _pingAll() {
    const peers = this.peerManager.getConnectedPeerIds();
    const now = performance.now();

    for (const peerId of peers) {
      
      if (this.packetLoss && Math.random() < 0.2) {
        const entry = this.table.get(peerId);
        if (entry) entry.stale = true;
        this._emit('packet_dropped', peerId);
        continue;
      }

      this.peerManager.sendTo(
        peerId,
        JSON.stringify({ type: 'ping', ts: now })
      );
    }
  }

  _onPong(peerId, sentTimestamp) {
    const rtt = performance.now() - sentTimestamp;

    let entry = this.table.get(peerId);
    if (!entry) {
      entry = { samples: [], avg: 0, stale: false };
      this.table.set(peerId, entry);
    }

    
    entry.samples.push(rtt);
    if (entry.samples.length > this.maxSamples) {
      entry.samples.shift();
    }

    
    entry.avg = entry.samples.reduce((a, b) => a + b, 0) / entry.samples.length;
    entry.stale = false;

    this._emit('latency_updated', peerId, entry.avg);
  }

  

    getTable() {
    const snapshot = new Map();
    for (const [id, entry] of this.table) {
      snapshot.set(id, { avg: entry.avg, stale: entry.stale, samples: entry.samples.length });
    }
    return snapshot;
  }

    getAverageLatency() {
    let sum = 0, count = 0;
    for (const [, entry] of this.table) {
      if (!entry.stale) {
        sum += entry.avg;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

    getPeerLatency(peerId) {
    const entry = this.table.get(peerId);
    return entry ? entry.avg : Infinity;
  }

    invalidatePeer(peerId) {
    this.table.delete(peerId);
  }

    setPingInterval(ms) {
    this.pingInterval = ms;
    if (this._intervalId) {
      this.stop();
      this.start();
    }
  }

    setPacketLoss(enabled) {
    this.packetLoss = enabled;
  }
}
