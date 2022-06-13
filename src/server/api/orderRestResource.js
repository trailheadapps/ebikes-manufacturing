module.exports = class OrderRestResource {
    constructor(sfdc) {
        this.sfdc = sfdc;
    }

    getOrders(request, response) {
        const soql = `SELECT Id, Name, Account__r.Name FROM Order__c WHERE Status__c='Submitted to Manufacturing'`;
        this.sfdc.query(soql, (err, result) => {
            if (err) {
                console.error(err);
                response.sendStatus(500);
            } else {
                response.send(result.records);
            }
        });
    }

    getOrder(request, response) {
        const { orderId } = request.params;
        const soql = `SELECT Id, Name, Account__r.Name FROM Order__c WHERE Id='${orderId.replace(
            "'",
            ''
        )}'`;
        this.sfdc.query(soql, (err, result) => {
            if (err) {
                console.error(err);
                response.sendStatus(500);
            } else if (result.records.length === 0) {
                response.status(404).send('Order not found.');
            } else {
                const data = result.records[0];
                response.send({ data });
            }
        });
    }

    getOrderItems(request, response) {
        const { orderId } = request.params;
        const soql = `SELECT Id, Product__r.Name, Product__r.Category__c, Product__r.Picture_URL__c, Price__c, Qty_S__c, Qty_M__c, Qty_L__c 
			FROM Order_Item__c 
			WHERE Order__c = '${orderId.replace("'", '')}'`;

        this.sfdc.query(soql, (err, result) => {
            if (err) {
                console.error(err);
                response.sendStatus(500);
            } else if (result.records.length === 0) {
                response.status(404).send('Order not found.');
            } else {
                response.send(result.records);
            }
        });
    }
};
