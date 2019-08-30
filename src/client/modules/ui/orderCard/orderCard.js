import { LightningElement, api, track, wire } from 'lwc';
import getOrderItems from 'data/wireOrderItems';

export default class OrderCard extends LightningElement {
    @api orderId;
    @api order;

    @track orderItems;

    @wire(getOrderItems, { orderId: '$orderId' })
    getOrderItems({ error, data }) {
        if (data) {
            this.orderItems = data;
        } else if (error) {
            console.error(
                'Failed to retrieve order items',
                JSON.stringify(error)
            );
        }
    }

    handleStatusClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.template.querySelector('.card').classList.add('slide-right');

        const { status } = event.currentTarget.dataset;
        const eventData = { detail: { orderId: this.orderId, status } };
        this.dispatchEvent(new CustomEvent('statuschange', eventData));
    }
}
