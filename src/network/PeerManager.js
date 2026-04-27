
const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export class PeerManager {
  constructor(signalingClient) {
    this._listeners = {};
    this.signaling = signalingClient;
    this.peers = new Map(); 
    this.myId = null;

    
    signalingClient.on('welcome', (id) => {
      this.myId = id;
    });

    signalingClient.on('peer_list', (peers) => {
      this._onPeerList(peers);
    });

    signalingClient.on('offer', (data) => this._onOffer(data));
    signalingClient.on('answer', (data) => this._onAnswer(data));
    signalingClient.on('ice-candidate', (data) => this._onIceCandidate(data));
  }

  

  on(event, cb) {
    (this._listeners[event] ||= []).push(cb);
    return this;
  }

  off(event, cb) {
    const arr = this._listeners[event];
    if (arr) this._listeners[event] = arr.filter(f => f !== cb);
    return this;
  }

  _emit(event, ...args) {
    const arr = this._listeners[event];
    if (arr) arr.forEach(cb => cb(...args));
  }

  

  _onPeerList(peerIds) {
    const otherPeers = peerIds.filter(id => id !== this.myId);

    
    for (const [id] of this.peers) {
      if (!otherPeers.includes(id)) {
        this._cleanupPeer(id);
        this._emit('peer_disconnected', id);
      }
    }

    
    for (const peerId of otherPeers) {
      if (!this.peers.has(peerId)) {
        const isInitiator = this.myId < peerId;
        this._createConnection(peerId, isInitiator);
      }
    }
  }

  

  async _createConnection(peerId, isInitiator) {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const peerEntry = { pc, dc: null, state: 'connecting' };
    this.peers.set(peerId, peerEntry);

    
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.signaling.send({
          type: 'ice-candidate',
          target: peerId,
          candidate: e.candidate,
        });
      }
    };

    
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      peerEntry.state = state;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this._emit('peer_disconnected', peerId);
      }
    };

    if (isInitiator) {
      
      const dc = pc.createDataChannel('mesh');
      peerEntry.dc = dc;
      this._setupDataChannel(dc, peerId);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.signaling.send({
          type: 'offer',
          target: peerId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error(`[PeerManager] Offer failed for ${peerId}:`, err);
      }
    } else {
      
      pc.ondatachannel = (e) => {
        peerEntry.dc = e.channel;
        this._setupDataChannel(e.channel, peerId);
      };
    }
  }

  _setupDataChannel(dc, peerId) {
    dc.onopen = () => {
      this._emit('datachannel_open', peerId);
      this._emit('peer_connected', peerId);
    };
    dc.onclose = () => {
      this._emit('datachannel_close', peerId);
    };
    dc.onmessage = (e) => {
      this._emit('datachannel_message', peerId, e.data);
    };
  }

  

  async _onOffer(data) {
    const peerId = data.from;
    if (!this.peers.has(peerId)) {
      await this._createConnection(peerId, false);
    }
    const peer = this.peers.get(peerId);
    if (!peer) return;

    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      
      if (peer.iceQueue) {
        for (const candidate of peer.iceQueue) {
          peer.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
        peer.iceQueue = [];
      }

      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      this.signaling.send({
        type: 'answer',
        target: peerId,
        sdp: peer.pc.localDescription,
      });
    } catch (err) {
      console.error(`[PeerManager] Answer failed for ${peerId}:`, err);
    }
  }

  async _onAnswer(data) {
    const peer = this.peers.get(data.from);
    if (peer) {
      try {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        
        if (peer.iceQueue) {
          for (const candidate of peer.iceQueue) {
            peer.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          }
          peer.iceQueue = [];
        }
      } catch (err) {
        console.error(`[PeerManager] Set answer failed for ${data.from}:`, err);
      }
    }
  }

  _onIceCandidate(data) {
    const peer = this.peers.get(data.from);
    if (peer) {
      if (peer.pc.remoteDescription && peer.pc.remoteDescription.type) {
        peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((err) => {
          console.error(`[PeerManager] Dropped ICE candidate from ${data.from}:`, err);
        });
      } else {
        peer.iceQueue = peer.iceQueue || [];
        peer.iceQueue.push(data.candidate);
      }
    }
  }

  

    sendTo(peerId, data) {
    const peer = this.peers.get(peerId);
    if (peer && peer.dc && peer.dc.readyState === 'open') {
      peer.dc.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }

    sendToAll(data) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    for (const [, peer] of this.peers) {
      if (peer.dc && peer.dc.readyState === 'open') {
        peer.dc.send(msg);
      }
    }
  }

    getConnectedPeerIds() {
    const ids = [];
    for (const [id, peer] of this.peers) {
      if (peer.dc && peer.dc.readyState === 'open') {
        ids.push(id);
      }
    }
    return ids;
  }

    closeConnection(peerId) {
    this._cleanupPeer(peerId);
  }

    killRandomPeer() {
    const connected = this.getConnectedPeerIds();
    if (connected.length === 0) return null;
    const victim = connected[Math.floor(Math.random() * connected.length)];
    this._cleanupPeer(victim);
    this._emit('peer_disconnected', victim);
    return victim;
  }

  _cleanupPeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      if (peer.dc) {
        try { peer.dc.close(); } catch (e) {}
      }
      try { peer.pc.close(); } catch (e) {}
      this.peers.delete(peerId);
    }
  }

    destroy() {
    for (const [id] of this.peers) {
      this._cleanupPeer(id);
    }
  }
}
