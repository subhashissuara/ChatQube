const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
    console.log('Connected!');
    ws.send("A message from client!");
    ws.on('message', (message) => {
        console.log(message);
    });
});