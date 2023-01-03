import * as dotenv from 'dotenv';

export default class Configuration {
    static checkConfig() {
        dotenv.config();
        [
            'SALESFORCE_LOGIN_URL',
            'SALESFORCE_API_VERSION',
            'SALESFORCE_USERNAME',
            'SALESFORCE_PASSWORD',
            'SALESFORCE_TOKEN'
        ].forEach((varName) => {
            if (!process.env[varName]) {
                console.error(`ERROR: Missing ${varName} environment variable`);
                process.exit(-1);
            }
        });
    }

    static getSfLoginUrl() {
        return process.env.SALESFORCE_LOGIN_URL;
    }

    static getSfApiVersion() {
        return process.env.SALESFORCE_API_VERSION;
    }

    static getSfUsername() {
        return process.env.SALESFORCE_USERNAME;
    }

    static getSfSecuredPassword() {
        return process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_TOKEN;
    }
}
