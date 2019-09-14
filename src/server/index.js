const jsforce = require('jsforce');
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

module.exports = (app, wss) => {
    // Connect to Salesforce
    const sfdc = new jsforce.Connection({
        loginUrl: SF_LOGIN_URL
    });
    sfdc.login(SF_USERNAME, SF_PASSWORD + SF_TOKEN, err => {
        if (err) {
            console.error(err);
            process.exit(-1);
        }
    }).then(() => {
        console.log('Connected to Salesforce');

        // Subscribe to Change Data Capture event on Reseller Order records
        sfdc.streaming.topic('/data/Order__ChangeEvent').subscribe(cdcEvent => {
            const status = cdcEvent.payload.Status__c;
            const header = cdcEvent.payload.ChangeEventHeader;
            // Filter events related to order status updates
            if (header.changeType === 'UPDATE' && status) {
                // Handle all impacted records
                header.recordIds.forEach(orderId => {
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
