/**
 * The default configuration file.
 */
require('dotenv').config()
module.exports = {
  PORT: process.env.PORT || 3001,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  // below are used for secure Kafka connection, they are optional
  // for the local Kafka, they are not needed
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY,

  // Kafka group id
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'taas-es-processor',
  // The originator value for the kafka messages
  KAFKA_MESSAGE_ORIGINATOR: process.env.KAFKA_MESSAGE_ORIGINATOR || 'taas-es-processor',

  topics: {
    // The error topic at which bus api will publish any errors
    KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || 'common.error.reporting',
    // topics for job service
    TAAS_JOB_CREATE_TOPIC: process.env.TAAS_JOB_CREATE_TOPIC || 'taas.job.create',
    TAAS_JOB_UPDATE_TOPIC: process.env.TAAS_JOB_UPDATE_TOPIC || 'taas.job.update',
    TAAS_JOB_DELETE_TOPIC: process.env.TAAS_JOB_DELETE_TOPIC || 'taas.job.delete',
    // topics for jobcandidate service
    TAAS_JOB_CANDIDATE_CREATE_TOPIC: process.env.TAAS_JOB_CANDIDATE_CREATE_TOPIC || 'taas.jobcandidate.create',
    TAAS_JOB_CANDIDATE_UPDATE_TOPIC: process.env.TAAS_JOB_CANDIDATE_UPDATE_TOPIC || 'taas.jobcandidate.update',
    TAAS_JOB_CANDIDATE_DELETE_TOPIC: process.env.TAAS_JOB_CANDIDATE_DELETE_TOPIC || 'taas.jobcandidate.delete',
    // topics for resource booking service
    TAAS_RESOURCE_BOOKING_CREATE_TOPIC: process.env.TAAS_RESOURCE_BOOKING_CREATE_TOPIC || 'taas.resourcebooking.create',
    TAAS_RESOURCE_BOOKING_UPDATE_TOPIC: process.env.TAAS_RESOURCE_BOOKING_UPDATE_TOPIC || 'taas.resourcebooking.update',
    TAAS_RESOURCE_BOOKING_DELETE_TOPIC: process.env.TAAS_RESOURCE_BOOKING_DELETE_TOPIC || 'taas.resourcebooking.delete',
    // topics for work period service
    TAAS_WORK_PERIOD_CREATE_TOPIC: process.env.TAAS_WORK_PERIOD_CREATE_TOPIC || 'taas.workperiod.create',
    TAAS_WORK_PERIOD_UPDATE_TOPIC: process.env.TAAS_WORK_PERIOD_UPDATE_TOPIC || 'taas.workperiod.update',
    TAAS_WORK_PERIOD_DELETE_TOPIC: process.env.TAAS_WORK_PERIOD_DELETE_TOPIC || 'taas.workperiod.delete',
    // topics for work period payment service
    TAAS_WORK_PERIOD_PAYMENT_CREATE_TOPIC: process.env.TAAS_WORK_PERIOD_PAYMENT_CREATE_TOPIC || 'taas.workperiodpayment.create',
    TAAS_WORK_PERIOD_PAYMENT_UPDATE_TOPIC: process.env.TAAS_WORK_PERIOD_PAYMENT_UPDATE_TOPIC || 'taas.workperiodpayment.update',
    // topics for interview service
    TAAS_INTERVIEW_REQUEST_TOPIC: process.env.TAAS_INTERVIEW_REQUEST_TOPIC || 'taas.interview.requested',
    TAAS_INTERVIEW_UPDATE_TOPIC: process.env.TAAS_INTERVIEW_UPDATE_TOPIC || 'taas.interview.update',
    TAAS_INTERVIEW_BULK_UPDATE_TOPIC: process.env.TAAS_INTERVIEW_BULK_UPDATE_TOPIC || 'taas.interview.bulkUpdate',
    // topics for role service
    TAAS_ROLE_CREATE_TOPIC: process.env.TAAS_ROLE_CREATE_TOPIC || 'taas.role.requested',
    TAAS_ROLE_UPDATE_TOPIC: process.env.TAAS_ROLE_UPDATE_TOPIC || 'taas.role.update',
    TAAS_ROLE_DELETE_TOPIC: process.env.TAAS_ROLE_DELETE_TOPIC || 'taas.role.delete',
    // special kafka topics
    TAAS_ACTION_RETRY_TOPIC: process.env.TAAS_ACTION_RETRY_TOPIC || 'taas.action.retry'

  },
  // maximum allowed retry count for failed operations for sending `action.retry` message
  MAX_RETRY: process.env.MAX_RETRY || 3,
  // base amount of retry delay for failed operations
  BASE_RETRY_DELAY: process.env.BASE_RETRY_DELAY || 500,
  // Topcoder Bus API URL
  BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',

  esConfig: {
    HOST: process.env.ES_HOST || 'http://localhost:9200',

    ELASTICCLOUD: {
      id: process.env.ELASTICCLOUD_ID,
      username: process.env.ELASTICCLOUD_USERNAME,
      password: process.env.ELASTICCLOUD_PASSWORD
    },

    AWS_REGION: process.env.AWS_REGION || 'us-east-1', // AWS Region to be used if we use AWS ES

    ES_INDEX_JOB: process.env.ES_INDEX_JOB || 'job',
    ES_INDEX_JOB_CANDIDATE: process.env.ES_INDEX_JOB_CANDIDATE || 'job_candidate',
    ES_INDEX_RESOURCE_BOOKING: process.env.ES_INDEX_RESOURCE_BOOKING || 'resource_booking',
    ES_INDEX_ROLE: process.env.ES_INDEX_ROLE || 'role'
  },

  auth0: {
    AUTH0_URL: process.env.AUTH0_URL,
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,
    TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME
  },

  zapier: {
    ZAPIER_COMPANYID_SLUG: process.env.ZAPIER_COMPANYID_SLUG,
    ZAPIER_CONTACTID_SLUG: process.env.ZAPIER_CONTACTID_SLUG,
    ZAPIER_SWITCH: process.env.ZAPIER_SWITCH || 'OFF',
    ZAPIER_WEBHOOK: process.env.ZAPIER_WEBHOOK,
    ZAPIER_JOB_CANDIDATE_SWITCH: process.env.ZAPIER_JOB_CANDIDATE_SWITCH || 'OFF',
    ZAPIER_JOB_CANDIDATE_WEBHOOK: process.env.ZAPIER_JOB_CANDIDATE_WEBHOOK,
    TOPCODER_API_URL: process.env.TOPCODER_API_URL || 'http://api.topcoder-dev.com/v5'
  }
}
