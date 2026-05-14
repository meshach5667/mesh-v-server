const { WebSocketServer } = require('ws');

let wss;

const initWebsocket = (server) => {
  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected' }));

    socket.on('error', () => {
      // Ignore socket errors to keep the server running.
    });
  });

  return wss;
};

const broadcast = (payload) => {
  if (!wss) {
    return;
  }

  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
};

module.exports = { initWebsocket, broadcast };
