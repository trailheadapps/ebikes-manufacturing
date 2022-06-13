const Configuration = require('./utils/configuration.js'),
    WebSocketService = require('./services/webSocketService.js'),
    SalesforceClient = require('./services/salesforceClient.js'),
    PubSubService = require('./services/pubSubService.js'),
    OrderRestResource = require('./api/orderRestResource.js'),
    LWR = require('lwr');

const ORDER_CDC_TOPIC = '/data/Order__ChangeEvent';
const MANUFACTURING_PE_TOPIC = '/event/Manufacturing_Event__e';

async function start() {
    Configuration.checkConfig();

    // Configure server
    const lwrServer = LWR.createServer();
    const app = lwrServer.getInternalServer();
    const wss = new WebSocketService();

    // Connect to Salesforce
    // Disclaimer: change this and use JWT auth in production!
    const sfClient = new SalesforceClient();
    await sfClient.connect(
        Configuration.getSfLoginUrl(),
        Configuration.getSfUsername(),
        Configuration.getSfSecuredPassword(),
        Configuration.getSfApiVersion()
    );

    // Use Pub Sub API to retrieve streaming event schemas
    const pubSub = new PubSubService(
        Configuration.getPubSubProtoFilePath(),
        Configuration.getPubSubEndpoint(),
        sfClient.client
    );
    const [orderCdcSchema, manufacturingPeSchema] = await Promise.all([
        pubSub.getEventSchema(ORDER_CDC_TOPIC),
        pubSub.getEventSchema(MANUFACTURING_PE_TOPIC)
    ]);

    // Subscribe to Change Data Capture events on Reseller Order records
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

start();
