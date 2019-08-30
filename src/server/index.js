const jsforce = require('jsforce');

const WebSocketService = require('./services/webSocketService.js');
const OrderRestResource = require('./services/orderRestResource.js');

// Load and check config
require('dotenv').config();
const { SF_USERNAME, SF_PASSWORD, SF_TOKEN, SF_LOGIN_URL } = process.env;
if (!(SF_USERNAME && SF_PASSWORD && SF_TOKEN && SF_LOGIN_URL)) {
    console.error(
        'Cannot start app: missing mandatory configuration. Check your .env file.'
    );
    process.exit(-1);
}

module.exports = app => {
    const wss = new WebSocketService();
    wss.connect();

    // Connect to Salesforce
    const sfdc = new jsforce.Connection({
        loginUrl: SF_LOGIN_URL
    });
    sfdc.login(SF_USERNAME, SF_PASSWORD + SF_TOKEN, err => {
        if (err) {
            console.error(err);
            process.exit(-1);
        }
        console.log('Connected to Salesforce');
    }).then(() => {
        // Subscribe to Change Data Capture on Reseller Order records
        sfdc.streaming.topic('/data/Order__ChangeEvent').subscribe(event => {
            const status = event.payload.Status__c;
            // Filter events to prevent loop
            if (status !== 'Approved by Manufacturing') {
                // Reformat message and send it to client via WebSocket
                const message = {
                    type: 'manufacturingEvent',
                    data: {
                        orderId: event.payload.ChangeEventHeader.recordIds[0],
                        status
                    }
                };
                wss.broadcast(JSON.stringify(message));
            }
        });
    });

    // Handle incoming WS events
    wss.addMessageListener(message => {
        const { orderId, status } = message.data;
        const eventData = { Order_Id__c: orderId, Status__c: status };
        sfdc.sobject('Manufacturing_Event__e').insert(
            eventData,
            (err, result) => {
                if (err || !result.success) {
                    console.error(err, result);
                } else {
                    console.log('Published Manufacturing_Event__e', eventData);
                }
            }
        );
    });

    // Setup REST resources
    const orderRest = new OrderRestResource(sfdc);
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
