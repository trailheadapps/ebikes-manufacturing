const configureServer = require('./index.js'),
    WebSocketService = require('./services/webSocketService.js'),
    LWR = require('lwr');

async function start() {
    // Configure server
    const lwrServer = LWR.createServer();
    const app = lwrServer.getInternalServer();
    const wss = new WebSocketService();
    await configureServer(app, wss);

    // HTTP and WebSocket Listen
    lwrServer
        .listen(({ port, serverMode }) => {
            console.log(
                `App listening on port ${port} in ${serverMode} mode\n`
            );
            wss.connect(app);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

start();
