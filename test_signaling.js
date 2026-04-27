import WebSocket from 'ws';

const ws1 = new WebSocket('ws://localhost:8080');
const ws2 = new WebSocket('ws://localhost:8080');

let id1, id2;

ws1.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'welcome') {
        id1 = msg.id;
        console.log('[1] Welcome', id1);
    } else {
        console.log('[1] Recv:', msg);
    }
});

ws2.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'welcome') {
        id2 = msg.id;
        console.log('[2] Welcome', id2);
        // Test sending a message from 2 to 1
        setTimeout(() => {
            console.log('[2] Sending test msg to 1');
            ws2.send(JSON.stringify({ type: 'offer', target: id1, sdp: 'fake-sdp' }));
        }, 100);
    } else {
        console.log('[2] Recv:', msg);
    }
});
