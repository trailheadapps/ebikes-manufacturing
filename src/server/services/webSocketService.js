import { WebSocket, WebSocketServer } from 'ws';

const WSS_PING_INTERVAL = 29000;

export default class WebSocketService {
    constructor() {
        this.messageListeners = [];
    }

    connect(server) {
        // Start WebSocket server
        this.wss = new WebSocketServer({
            clientTracking: true,
            path: '/websockets',
            server
        });

        // Listen to lifecycle events
        this.wss.on('listening', () => {
            console.log('WebSocket server listening');
        });
        this.wss.on('error', (error) => {
            console.log(`WebSocket server error: ${error}`);
        });
        this.wss.on('close', () => {
            console.log('WebSocket server closed.');
        });

        // Listen for new client connections
        this.wss.on('connection', (wsClient) => {
            console.log('WS client connected');
            wsClient.isAlive = true;

            wsClient.on('message', (message) => {
                const data = JSON.parse(message);
                if (data.type === 'pong') {
                    wsClient.isAlive = true;
                } else {
                    console.log('WS incomming message ', data);
                    this.messageListeners.forEach((listener) => {
                        listener(data);
                    });
                }
            });

            wsClient.on('close', () => {
                console.log('WS connection closed');
            });
        });

        // Check if WS clients are alive
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setInterval(() => {
            this.wss.clients.forEach((wsClient) => {
                if (!wsClient.isAlive) {
                    console.log('WS removing inactive client');
                    wsClient.terminate();
                } else {
                    wsClient.isAlive = false;
                    wsClient.send('{"type": "ping"}');
                }
            });
        }, WSS_PING_INTERVAL);
    }

    addMessageListener(listener) {
        this.messageListeners.push(listener);
    }

    /**
     * Broadcasts an object to all WS clients
     * @param {*} data object sent to WS client
     */
    broadcast(data) {
        console.log(
            `WS broadcasting to ${this.wss.clients.size} client(s): `,
            data
        );
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data, (error) => {
                    if (error) {
                        console.error('WS send error ', error);
                    }
                });
            }
        });
    }
}
