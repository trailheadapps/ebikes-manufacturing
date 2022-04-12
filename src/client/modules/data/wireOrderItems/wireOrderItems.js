import { register, ValueChangedEvent } from '@lwc/wire-service';

export default function getOrderItems(config) {
    return new Promise((resolve, reject) => {
        const observer = {
            next: (data) => resolve(data),
            error: (error) => reject(error)
        };
        getData(config, observer);
    });
}

function getData(config, observer) {
    if (!(config && config.orderId)) {
        observer.next([]);
        return;
    }
    fetch(`/api/orders/${config.orderId}/items`)
        .then((response) => {
            if (!response.ok) {
                observer.error('No response from server');
            }
            return response.json();
        })
        .then((data) => {
            observer.next(data);
        })
        .catch((error) => {
            observer.error(error);
        });
}

register(getOrderItems, (eventTarget) => {
    let config;
    eventTarget.dispatchEvent(
        new ValueChangedEvent({ data: undefined, error: undefined })
    );

    const observer = {
        next: (data) =>
            eventTarget.dispatchEvent(
                new ValueChangedEvent({ data, error: undefined })
            ),
        error: (error) =>
            eventTarget.dispatchEvent(
                new ValueChangedEvent({ data: undefined, error })
            )
    };

    eventTarget.addEventListener('config', (newConfig) => {
        config = newConfig;
        getData(config, observer);
    });

    eventTarget.addEventListener('connect', () => {
        getData(config, observer);
    });
});
