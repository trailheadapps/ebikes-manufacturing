const OrderRestResource = require('./api/orderRestResource.js');
const SalesforceClient = require('./services/salesforceClient.js');
const PubSubService = require('./services/pubSubService.js');

// Load and check config
require('dotenv').config();
[
    'SALESFORCE_LOGIN_URL',
    'SALESFORCE_USERNAME',
    'SALESFORCE_PASSWORD',
    'SALESFORCE_TOKEN',
    'PUB_SUB_ENDPOINT',
    'PUB_SUB_PROTO_FILE'
].forEach((varName) => {
    if (!process.env[varName]) {
        console.error(`Missing ${varName} environment variable`);
        process.exit(-1);
    }
});
const {
    SALESFORCE_LOGIN_URL,
    SALESFORCE_USERNAME,
    SALESFORCE_PASSWORD,
    SALESFORCE_TOKEN,
    PUB_SUB_ENDPOINT,
    PUB_SUB_PROTO_FILE
} = process.env;

const ORDER_CDC_TOPIC = '/data/Order__ChangeEvent';
const MANUFACTURING_PE_TOPIC = '/event/Manufacturing_Event__e';

module.exports = async (app, wss) => {
    // Connect to Salesforce
    const sfClient = new SalesforceClient();
    await sfClient.connect(
        SALESFORCE_LOGIN_URL,
        SALESFORCE_USERNAME,
        SALESFORCE_PASSWORD + SALESFORCE_TOKEN
    );

    // Use Pub Sub API to retrieve streaming event schemas
    const pubSub = new PubSubService(
        PUB_SUB_PROTO_FILE,
        PUB_SUB_ENDPOINT,
        sfClient
    );
    const [orderCdcSchema, manufacturingPeSchema] = await Promise.all([
        pubSub.getEventSchema(ORDER_CDC_TOPIC),
        pubSub.getEventSchema(MANUFACTURING_PE_TOPIC)
    ]);

    // Subscribe to Change Data Capture event on Reseller Order records
    pubSub.subscribe(ORDER_CDC_TOPIC, orderCdcSchema, 10, (cdcEvent) => {
        const status = cdcEvent.payload.Status__c?.string;
        const header = cdcEvent.payload.ChangeEventHeader;
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
    });

    // Handle incoming WS events
    wss.addMessageListener(async (message) => {
        const { orderId, status } = message.data;
        const eventData = {
            CreatedDate: Date.now(),
            CreatedById: sfClient.client.userInfo.id,
            Order_Id__c: { string: orderId },
            Status__c: { string: status }
        };
        await pubSub.publish(
            MANUFACTURING_PE_TOPIC,
            manufacturingPeSchema,
            eventData
        );
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
};
