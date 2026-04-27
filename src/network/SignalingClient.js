
export class SignalingClient {
  constructor() {
    this._listeners = {};
    this.ws = null;
    this.myId = null;
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

  

  connect(url = 'ws://localhost:8080') {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => this._emit('open');
    this.ws.onclose = () => this._emit('close');
    this.ws.onerror = (e) => this._emit('error', e);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'welcome':
            this.myId = data.id;
            this._emit('welcome', data.id);
            break;
          case 'peer_list':
            this._emit('peer_list', data.peers);
            break;
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            this._emit(data.type, data);
            break;
          default:
            this._emit('message', data);
        }
      } catch (e) {
        console.error('[SignalingClient] Parse error:', e);
      }
    };
  }

    send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

    relay(type, target, payload = {}) {
    this.send({ type, target, ...payload });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
