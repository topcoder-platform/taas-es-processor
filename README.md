# Taas ES Processor

## Dependencies

- Nodejs(v12+)
- ElasticSearch
- Kafka

## Configuration

Configuration is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- `PORT`: port number the health check dropin listnering on
- `LOG_LEVEL`: the log level
- `KAFKA_URL`: comma separated Kafka hosts
- `KAFKA_CLIENT_CERT`: Kafka connection certificate, optional;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- `KAFKA_CLIENT_CERT_KEY`: Kafka connection private key, optional;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- `KAFKA_GROUP_ID`: the Kafka group id
- `topics.TAAS_JOB_CREATE_TOPIC`: the create job entity Kafka message topic
- `topics.TAAS_JOB_UPDATE_TOPIC`: the update job entity Kafka message topic
- `topics.TAAS_JOB_DELETE_TOPIC`: the delete job entity Kafka message topic
- `topics.TAAS_JOB_CANDIDATE_CREATE_TOPIC`: the create job candidate entity Kafka message topic
- `topics.TAAS_JOB_CANDIDATE_UPDATE_TOPIC`: the update job candidate entity Kafka message topic
- `topics.TAAS_JOB_CANDIDATE_DELETE_TOPIC`: the delete job candidate entity Kafka message topic
- `topics.TAAS_RESOURCE_BOOKING_CREATE_TOPIC`: the create resource booking entity Kafka message topic
- `topics.TAAS_RESOURCE_BOOKING_UPDATE_TOPIC`: the update resource booking entity Kafka message topic
- `topics.TAAS_RESOURCE_BOOKING_DELETE_TOPIC`: the delete resource booking entity Kafka message topic
- `topics.TAAS_WORK_PERIOD_CREATE_TOPIC`: the create work period entity Kafka message topic
- `topics.TAAS_WORK_PERIOD_UPDATE_TOPIC`: the update work period entity Kafka message topic
- `topics.TAAS_WORK_PERIOD_DELETE_TOPIC`: the delete work period entity Kafka message topic
- `topics.TAAS_INTERVIEW_REQUEST_TOPIC`: the request interview entity Kafka message topic
- `esConfig.HOST`: Elasticsearch host
- `esConfig.AWS_REGION`: The Amazon region to use when using AWS Elasticsearch service
- `esConfig.ELASTICCLOUD.id`: The elastic cloud id, if your elasticsearch instance is hosted on elastic cloud. DO NOT provide a value for ES_HOST if you are using this
- `esConfig.ELASTICCLOUD.username`: The elastic cloud username for basic authentication. Provide this only if your elasticsearch instance is hosted on elastic cloud
- `esConfig.ELASTICCLOUD.password`: The elastic cloud password for basic authentication. Provide this only if your elasticsearch instance is hosted on elastic cloud
- `esConfig.ES_INDEX_JOB`: the index name for job
- `esConfig.ES_INDEX_JOB_CANDIDATE`: the index name for job candidate
- `esConfig.ES_INDEX_RESOURCE_BOOKING`: the index name for resource booking
- `esConfig.ES_INDEX_WORK_PERIOD`: the index name for work period

- `auth0.AUTH0_URL`: Auth0 URL, used to get TC M2M token
- `auth0.AUTH0_AUDIENCE`: Auth0 audience, used to get TC M2M token
- `auth0.AUTH0_CLIENT_ID`: Auth0 client id, used to get TC M2M token
- `auth0.AUTH0_CLIENT_SECRET`: Auth0 client secret, used to get TC M2M token
- `auth0.AUTH0_PROXY_SERVER_URL`: Proxy Auth0 URL, used to get TC M2M token

- `zapier.ZAPIER_COMPANYID_SLUG`: your company id in zapier; numeric value
- `zapier.ZAPIER_CONTACTID_SLUG`: your contact id in zapier; numeric value
- `zapier.ZAPIER_SWITCH`: decides whether posting job related message to zapier or not; possible values are `ON` and `OFF`, default is `OFF`
- `zapier.ZAPIER_WEBHOOK`: the remote zapier zap webhook url for posting job related message
- `zapier.ZAPIER_JOB_CANDIDATE_SWITCH`: decides whether posting job candidate related message to zapier or not; possible values are `ON` and `OFF`, default is `OFF`
- `zapier.ZAPIER_JOB_CANDIDATE_WEBHOOK`: the remote zapier zap webhook url for posting job candidate related message

## Local Kafka and ElasticSearch setup

1. Navigate to the directory `local`

2. Run the following command

    ```bash
    docker-compose up -d
    ```

3. initialize Elasticsearch, create configured Elasticsearch index:

    ``` bash
    npm run delete-index # run this if you already created index
    npm run create-index
    ```

## Local deployment

1. Make sure that Kafka and Elasticsearch is running as per instructions above.

2. From the project root directory, run the following command to install the dependencies

    ```bash
    npm install
    ```

3. To run linters if required

    ```bash
    npm run lint
    ```

    To fix possible lint errors:

    ```bash
    npm run lint:fix
    ```

5. Start the processor and health check dropin

    ```bash
    npm start
    ```

## Local Deployment with Docker

To run the processor using docker, follow the below steps

1. Navigate to the directory `docker`

2. Rename the file `sample.api.env` to `api.env`

3. Set the required Kafka url and ElasticSearch host in the file `api.env`.

    Note that you can also add other variables to `api.env`, with `<key>=<value>` format per line.
    If using AWS ES you should add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` variables as well.


4. Once that is done, run the following command

    ```bash
    docker-compose up
    ```

5. When you are running the application for the first time, It will take some time initially to download the image and install the dependencies

## Unit Tests and E2E Tests

### Unit Tests
- Run `npm run test` to execute unit tests.
- Run `npm run test:cov` to execute unit tests and generate coverage report.

### E2E Tests
Before running e2e tests, make sure index are created and the processor app is not running. Existing documents will be remove
from ES before and after tests.

- RUN `npm run e2e` to execute e2e tests.
- RUN `npm run e2e:cov` to execute e2e tests and generate coverage report.

## Verification

see [VERIFICATION.md](VERIFICATION.md)
