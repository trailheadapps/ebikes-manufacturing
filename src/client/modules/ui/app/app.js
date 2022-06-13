/* eslint-disable no-console */
import { LightningElement, track, wire } from 'lwc';
import { WebSocketClient } from 'utils/webSocketClient';
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
        // Get WebSocket URL
        const wsUrl =
            (window.location.protocol === 'http:' ? 'ws://' : 'wss://') +
            window.location.host +
            '/websockets';
        // Connect WebSocket
        this.ws = new WebSocketClient(wsUrl);
        this.ws.connect();
        this.ws.addMessageListener((message) => {
            this.handleWsMessage(message);
        });
    }

    disconnectedCallback() {
        this.ws.close();
    }

    handleWsMessage(message) {
        if (message?.type === 'manufacturingEvent') {
            const { orderId, status } = message.data;
            if (status === 'Draft') {
                this.removeOrder(orderId);
            } else if (status === 'Submitted to Manufacturing') {
                this.loadOrder(orderId);
            }
        }
    }

    loadOrder(orderId) {
        const index = this.orders.findIndex((order) => order.Id === orderId);
        if (index === -1) {
            fetch(`/api/orders/${orderId}`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('No response from server');
                    }
                    return response.json();
                })
                .then((result) => {
                    this.orders.push(result.data);
                });
        }
    }

    removeOrder(orderId) {
        const index = this.orders.findIndex((order) => order.Id === orderId);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.orders.splice(index, 1);
        }, DELETE_ANIMATION_DURATION);
    }

    handleStatusChange(event) {
        const { orderId } = event.detail;
        const index = this.orders.findIndex((order) => order.Id === orderId);
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
