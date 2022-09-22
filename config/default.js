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

  TAAS_API_URL: process.env.TAAS_API_URL || 'https://api.topcoder-dev.com/v5',

  topics: {
    // topics for job service
    TAAS_JOB_CREATE_TOPIC: process.env.TAAS_JOB_CREATE_TOPIC || 'taas.job.create',
    TAAS_JOB_UPDATE_TOPIC: process.env.TAAS_JOB_UPDATE_TOPIC || 'taas.job.update',
    // topics for jobcandidate service
    TAAS_JOB_CANDIDATE_UPDATE_TOPIC: process.env.TAAS_JOB_CANDIDATE_UPDATE_TOPIC || 'taas.jobcandidate.update'
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
    ZAPIER_SWITCH: 'OFF',
    ZAPIER_WEBHOOK: process.env.ZAPIER_WEBHOOK,
    ZAPIER_JOB_CANDIDATE_SWITCH: 'OFF',
    ZAPIER_JOB_CANDIDATE_WEBHOOK: process.env.ZAPIER_JOB_CANDIDATE_WEBHOOK,
    TOPCODER_API_URL: process.env.TOPCODER_API_URL || 'http://api.topcoder-dev.com/v5'
  }
}
