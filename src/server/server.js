const express = require('express'),
    path = require('path'),
    configureServer = require('./index.js'),
    WebSocketService = require('./services/webSocketService.js');

const PORT = process.env.PORT || 3002;
const DIST_DIR = path.join(__dirname, '../../dist');

const wss = new WebSocketService();

// Configure and start express
const app = express();
app.use(express.static(DIST_DIR));
configureServer(app, wss);
const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

// Connect WebSocket server
wss.connect(server);
