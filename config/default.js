/**
 * The default configuration file.
 */

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

  topics: {
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
    // topics for interview service
    TAAS_INTERVIEW_REQUEST_TOPIC: process.env.TAAS_INTERVIEW_REQUEST_TOPIC || 'taas.interview.request'
  },

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
    ES_INDEX_WORK_PERIOD: process.env.ES_INDEX_WORK_PERIOD || 'work_period'
  },

  auth0: {
    AUTH0_URL: process.env.AUTH0_URL,
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL
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
