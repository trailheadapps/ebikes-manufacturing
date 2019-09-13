/* eslint-disable no-console */
import { LightningElement, track, wire } from 'lwc';
import getOrders from 'data/wireOrders';

const DELETE_ANIMATION_DURATION = 1500;

export default class App extends LightningElement {
    @track orders = [];

    @wire(getOrders)
    getOrders({ error, data }) {
        if (data) {
            this.orders = data;
        } else if (error) {
            console.error('Failed to retrieve orders', JSON.stringify(error));
        }
    }

    connectedCallback() {
        this.setupWebSocket();
    }

    setupWebSocket() {
        // Get WebSocket URL
        const url =
            (window.location.protocol === 'http:' ? 'ws://' : 'wss://') +
            window.location.host;
        // Open connection
        console.log('WS opening ', url);
        this.ws = new WebSocket(url);
        this.ws.addEventListener('open', () => {
            console.log('WS open');
            this.heartbeat();
        });
        // Listen for messages
        this.ws.addEventListener('message', event => {
            const eventData = JSON.parse(event.data);
            if (eventData.type === 'ping') {
                this.ws.send('{ "type" : "pong" }');
                this.heartbeat();
                return;
            }

            console.log('WS received: ', eventData);
            const { orderId, status } = eventData.data;
            if (status === 'Draft') {
                this.removeOrder(orderId);
            } else if (status === 'Submitted to Manufacturing') {
                this.loadOrder(orderId);
            }
        });

        // Listen for errors
        this.ws.addEventListener('error', event => {
            console.error('WS error', event);
        });

        this.ws.addEventListener('close', () => {
            clearTimeout(this.pingTimeout);
            console.info('WS connection closed');
        });
    }

    heartbeat() {
        clearTimeout(this.pingTimeout);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.pingTimeout = setTimeout(() => {
            this.ws.close();
            console.warn('WS connection closed after timeout');
        }, 30000 + 1000);
    }

    loadOrder(orderId) {
        const index = this.orders.findIndex(order => order.Id === orderId);
        if (index === -1) {
            fetch(`/api/orders/${orderId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('No response from server');
                    }
                    return response.json();
                })
                .then(result => {
                    this.orders.push(result.data);
                });
        }
    }

    removeOrder(orderId) {
        const index = this.orders.findIndex(order => order.Id === orderId);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.orders.splice(index, 1);
        }, DELETE_ANIMATION_DURATION);
    }

    handleStatusChange(event) {
        const { orderId } = event.detail;
        const index = this.orders.findIndex(order => order.Id === orderId);
        if (index !== -1) {
            const eventData = {
                type: 'manufacturingEvent',
                data: event.detail
            };
            console.log('WS send: ', eventData);
            this.ws.send(JSON.stringify(eventData));
            this.removeOrder(orderId);
        }
    }

    get hasOrders() {
        return this.orders.length > 0;
    }
}
