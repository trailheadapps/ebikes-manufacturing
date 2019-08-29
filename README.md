# E-Bikes Manufacturing Site

This site is built on Lightning Web Components Open Source.

## Heroku deploy (recommended)

Click on this button and follow the instructions to deploy the app:

<p align="center">
  <a href="https://heroku.com/deploy">
    <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy">
  </a>
<p>

## Local setup

Create a `.env` file at the root of the project:

```
SF_LOGIN_URL='https://test.salesforce.com'
SF_USERNAME='YOUR_SALESFORCE_USERNAME'
SF_PASSWORD='YOUR_SALESFORCE_PASSWORD'
SF_TOKEN='YOUR_SALESFORCE_SECURITY_TOKEN'
```

Run the project with `npm run build:development && npm run serve`
