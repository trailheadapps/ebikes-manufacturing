export class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.messageListeners = [];
    }

    connect() {
        // Open connection
        console.log('WS opening ', this.url);
        this.ws = new WebSocket(this.url);
        this.ws.addEventListener('open', () => {
            console.log('WS open');
            this.heartbeat();
        });

        // Listen for messages while filtering ping messages
        this.ws.addEventListener('message', (event) => {
            const eventData = JSON.parse(event.data);
            if (eventData.type === 'ping') {
                this.ws.send('{ "type" : "pong" }');
                this.heartbeat();
            } else {
                this.messageListeners.forEach((listener) => {
                    listener(eventData);
                });
            }
        });

        // Listen for errors
        this.ws.addEventListener('error', (event) => {
            console.error('WS error', event);
        });

        this.ws.addEventListener('close', () => {
            clearTimeout(this.pingTimeout);
            console.info('WS connection closed');
        });
    }

    addMessageListener(listener) {
        this.messageListeners.push(listener);
    }

    heartbeat() {
        clearTimeout(this.pingTimeout);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.pingTimeout = setTimeout(() => {
            this.ws.close();
            console.warn('WS connection closed after timeout. Reconnecting.');
            this.connect();
        }, 30000 + 1000);
    }

    send(message) {
        this.ws.send(message);
    }
}
