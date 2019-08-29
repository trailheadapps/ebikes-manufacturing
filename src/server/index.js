const jsforce = require('jsforce');

const WebSocketService = require('./webSocketService.js');
const OrderRestResource = require('./rest/order.js');

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
        // Broadcast incoming Platform Events to WS clients
        sfdc.streaming
            .topic('/event/Manufacturing_Event__e')
            .subscribe(event => {
                // Filter event to prevent loop
                if (event.payload.Status__c !== 'Approved by Manufacturing') {
                    const message = {
                        type: 'manufacturingEvent',
                        data: event
                    };
                    wss.broadcast(JSON.stringify(message));
                }
            });
    });

    // Handle incoming WS events
    wss.addMessageListener(message => {
        console.log('Incoming WS message', message);
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
