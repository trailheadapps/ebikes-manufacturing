import Configuration from './utils/configuration.js';
import WebSocketService from './services/webSocketService.js';
import SalesforceClient from './services/salesforceClient.js';
import OrderRestResource from './api/orderRestResource.js';
import { createServer } from 'lwr';
import PubSubApiClient from 'salesforce-pubsub-api-client';

const ORDER_CDC_TOPIC = '/data/Order__ChangeEvent';
const MANUFACTURING_PE_TOPIC = '/event/Manufacturing_Event__e';

/**
 * WebSocket service
 * @type {WebSocketService}
 */
var wss;

async function start() {
    Configuration.checkConfig();

    // Configure server
    const lwrServer = createServer();
    const app = lwrServer.getInternalServer();
    wss = new WebSocketService();

    // Connect to Salesforce
    // Disclaimer: change this and use JWT auth in production!
    const sfClient = new SalesforceClient();
    await sfClient.connect(
        Configuration.getSfLoginUrl(),
        Configuration.getSfUsername(),
        Configuration.getSfSecuredPassword(),
        Configuration.getSfApiVersion()
    );
    const conMetadata = sfClient.getConnectionMetadata();

    // Connect to Pub Sub API
    const pubSubClient = new PubSubApiClient({
        authType: 'user-supplied',
        accessToken: conMetadata.accessToken,
        instanceUrl: conMetadata.instanceUrl,
        organizationId: conMetadata.organizationId
    });
    await pubSubClient.connect();

    // Subscribe to Change Data Capture events on Reseller Order records
    pubSubClient.subscribe(ORDER_CDC_TOPIC, orderChangeEventHandler);

    // Handle incoming WS events
    wss.addMessageListener(async (message) => {
        const { orderId, status } = message.data;
        const eventData = {
            CreatedDate: Date.now(),
            CreatedById: sfClient.client.userInfo.id,
            Order_Id__c: { string: orderId },
            Status__c: { string: status }
        };
        await pubSubClient.publish(MANUFACTURING_PE_TOPIC, eventData);
        console.log('Published Manufacturing_Event__e', eventData);
    });

    // Setup REST resources
    const orderRest = new OrderRestResource(sfClient.client);
    app.get('/api/orders', (request, response) => {
        orderRest.getOrders(request, response);
    });
    app.get('/api/orders/:orderId', (request, response) => {
        orderRest.getOrder(request, response);
    });
    app.get('/api/orders/:orderId/items', (request, response) => {
        orderRest.getOrderItems(request, response);
    });

    // HTTP and WebSocket Listen
    wss.connect(lwrServer.server);
    lwrServer
        .listen(({ port, serverMode }) => {
            console.log(
                `App listening on port ${port} in ${serverMode} mode\n`
            );
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

function orderChangeEventHandler(subscription, callbackType, data) {
    switch (callbackType) {
        case 'event':
            {
                const status = data.payload.Status__c;
                const header = data.payload.ChangeEventHeader;
                // Filter events related to order status updates
                if (header.changeType === 'UPDATE' && status) {
                    header.recordIds.forEach((orderId) => {
                        // Notify client via WebSocket
                        const message = {
                            type: 'manufacturingEvent',
                            data: {
                                orderId,
                                status
                            }
                        };
                        wss.broadcast(JSON.stringify(message));
                    });
                }
            }
            break;
        default:
    }
}

start();
