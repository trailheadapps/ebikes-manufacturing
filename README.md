# E-Bikes Manufacturing Site

This site is built with the Lightning Web Runtime.

## Heroku deploy (recommended)

Click on this button and follow the instructions to deploy the app:

<p align="center">
  <a href="https://heroku.com/deploy?template=https://github.com/pozil/ebikes-manufacturing-lwc-oss">
    <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy">
  </a>
<p>

## Local setup

Create a `.env` file at the root of the project:

```
SALESFORCE_LOGIN_URL='https://test.salesforce.com'
SALESFORCE_USERNAME='YOUR_SALESFORCE_USERNAME'
SALESFORCE_PASSWORD='YOUR_SALESFORCE_PASSWORD'
SALESFORCE_TOKEN='YOUR_SALESFORCE_SECURITY_TOKEN'

PUB_SUB_ENDPOINT="api.pilot.pubsub.salesforce.com:7443"
PUB_SUB_PROTO_FILE="pubsub_api.proto"
```

Run the project with `npm start`
