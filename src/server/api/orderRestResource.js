export default class OrderRestResource {
    constructor(sfdc) {
        this.sfdc = sfdc;
    }

    async getOrders(request, response) {
        try {
            const soql = `SELECT Id, Name, Account__r.Name FROM Order__c WHERE Status__c='Submitted to Manufacturing'`;
            const result = await this.sfdc.query(soql);
            response.send(result.records);
        } catch (err) {
            console.error(err);
            response.sendStatus(500);
        }
    }

    async getOrder(request, response) {
        try {
            let { orderId } = request.params;
            orderId = orderId.replace("'", '');
            const soql = `SELECT Id, Name, Account__r.Name FROM Order__c WHERE Id='${orderId}'`;
            const result = await this.sfdc.query(soql);
            if (result.records.length === 0) {
                response.status(404).send('Order not found.');
            } else {
                const data = result.records[0];
                response.send({ data });
            }
        } catch (err) {
            console.error(err);
            response.sendStatus(500);
        }
    }

    async getOrderItems(request, response) {
        try {
            let { orderId } = request.params;
            orderId = orderId.replace("'", '');
            const soql = `SELECT Id, Product__r.Name, Product__r.Category__c, Product__r.Picture_URL__c, Price__c, Qty_S__c, Qty_M__c, Qty_L__c 
                FROM Order_Item__c 
                WHERE Order__c = '${orderId}'`;
            const result = await this.sfdc.query(soql);
            if (result.records.length === 0) {
                response.status(404).send('Order not found.');
            } else {
                response.send(result.records);
            }
        } catch (err) {
            console.error(err);
            response.sendStatus(500);
        }
    }
}
