const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const avro = require('avro-js');
const certifi = require('certifi');

module.exports = class PubSubService {
    client;

    /**
     * Connects to the Pub/Sub API and returns a gRPC client
     * @param {string} protoFilePath
     * @param {string} endpoint
     * @param {SalesforceClient} salesforceClient
     */
    constructor(protoFilePath, endpoint, salesforceClient) {
        // Read certificates
        const rootCert = fs.readFileSync(certifi);
        // Load proto definition
        const packageDef = protoLoader.loadSync(protoFilePath, {});
        const grpcObj = grpc.loadPackageDefinition(packageDef);
        const sfdcPackage = grpcObj.eventbus.v1;

        // Prepare gRPC connection
        const metaCallback = (_params, callback) => {
            const meta = new grpc.Metadata();
            meta.add('accesstoken', salesforceClient.accessToken);
            meta.add('instanceurl', salesforceClient.instanceUrl);
            meta.add('tenantid', salesforceClient.userInfo.organizationId);
            callback(null, meta);
        };
        const callCreds =
            grpc.credentials.createFromMetadataGenerator(metaCallback);
        const combCreds = grpc.credentials.combineChannelCredentials(
            grpc.credentials.createSsl(rootCert),
            callCreds
        );

        // Save pub/sub gRPC client
        this.client = new sfdcPackage.PubSub(endpoint, combCreds);
        console.log(`Pub/Sub API client is ready to connect`);
    }

    /**
     * Requests the event schema for a topic
     * @param {string} topicName name of the topic that we're fetching
     * @returns {Object} parsed event schema `{id: string, type: Object}`
     */
    async getEventSchema(topicName) {
        return new Promise((resolve, reject) => {
            this.client.GetTopic({ topicName }, (err, response) => {
                if (err) {
                    // Handle error
                    reject(err);
                } else {
                    // Get the schema information
                    const schemaId = response.schemaId;
                    this.client.GetSchema({ schemaId }, (error, res) => {
                        if (error) {
                            // Handle error
                            reject(err);
                        } else {
                            const schemaType = avro.parse(res.schemaJson);
                            console.log(
                                `Pub/Sub topic schema loaded: ${topicName}`
                            );
                            resolve({
                                id: schemaId,
                                type: schemaType
                            });
                        }
                    });
                }
            });
        });
    }

    /**
     * Subscribes to a topic using the gRPC client and an event schema
     * @param {string} topicName name of the topic that we're subscribing to
     * @param {Object} schema event schema associated with the topic
     * @param {string} schema.id
     * @param {Object} schema.type
     * @param {number} numRequested number of incoming events that will be accepted before connection is closed
     * @param {Function} eventHandler
     */
    subscribe(topicName, schema, numRequested, eventHandler) {
        const subscription = this.client.Subscribe();
        // Since this is a stream, you can call the write method multiple times.
        // Only the required data is being passed here, the topic name & the numReqested
        // Once the system has received the events == to numReqested then the stream will end.
        const subscribeRequest = {
            topicName,
            numRequested
        };
        subscription.write(subscribeRequest);
        console.log(
            `Pub/Sub subscribe request sent for ${subscribeRequest.numRequested} events for topic ${topicName}...`
        );

        // Listen to new events.
        subscription.on('data', (data) => {
            if (data.events) {
                const latestReplayId = data.latestReplayId.readBigUInt64BE();
                console.log(
                    `Received ${data.events.length} events, latest replay ID: ${latestReplayId}`
                );
                const parsedEvents = data.events.map((event) => {
                    const replayId = event.replayId
                        .readBigUInt64BE()
                        .toString();
                    const payload = schema.type.fromBuffer(event.event.payload); // This schema is the same which we retreived earlier in the GetSchema rpc.
                    return {
                        replayId,
                        payload
                    };
                });
                console.log(
                    'gRPC event payloads: ',
                    JSON.stringify(parsedEvents, null, 2)
                );
                parsedEvents.forEach((event) => eventHandler(event));
            } else {
                // If there are no events then every 270 seconds the system will keep publishing the latestReplayId.
            }
        });
        subscription.on('end', () => {
            console.log('gRPC stream ended');
        });
        subscription.on('error', (err) => {
            // Handle errors
            console.error('gRPC stream error: ', JSON.stringify(err));
        });
        subscription.on('status', (status) => {
            console.log('gRPC stream status: ', status);
        });
    }

    /**
     * Publishes a payload to a topic using the gRPC client
     * @param {string} topicName name of the topic that we're subscribing to
     * @param {Object} schema event schema associated with the topic
     * @param {Object} payload
     */
    async publish(topicName, schema, payload) {
        return new Promise((resolve, reject) => {
            this.client.Publish(
                {
                    topicName,
                    events: [
                        {
                            id: '124', // this can be any string
                            schemaId: schema.id,
                            payload: schema.type.toBuffer(payload)
                        }
                    ]
                },
                (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }
};
