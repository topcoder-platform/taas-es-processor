/**
 * Contains generic helper methods
 */

const config = require('config')
const request = require('superagent')
const logger = require('./logger')
const _ = require('lodash')
const m2mAuth = require('tc-core-library-js').auth.m2m

let m2m

/**
 * Get Kafka options
 * @return {Object} the Kafka options
 */
function getKafkaOptions () {
  const options = { connectionString: config.KAFKA_URL, groupId: config.KAFKA_GROUP_ID }
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
  }
  return options
}

/*
 * Function to get M2M token
 * @returns {Promise}
 */
async function getM2MToken () {
  if (!m2m) {
    m2m = m2mAuth(_.pick(config.auth0, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'AUTH0_PROXY_SERVER_URL']))
  }
  return m2m.getMachineToken(config.auth0.AUTH0_CLIENT_ID, config.auth0.AUTH0_CLIENT_SECRET)
}

/**
 * Post message to zapier via webhook url.
 *
 * @param {String} webhook the webhook url
 * @param {Object} message the message data
 * @returns {undefined}
 */
async function postMessageViaWebhook (webhook, message) {
  logger.debug({ component: 'helper', context: 'postMessageToZapier', message: `message: ${JSON.stringify(message)}` })
  await request.post(webhook).send(message)
}

/**
 * Get job by jobId
 *
 * @param {String} jobId jobId
 * @returns {undefined}
 */
async function getJobById (jobId) {
  logger.debug({ component: 'helper', context: 'getJobById', message: `jobId: ${jobId}` })

  const token = await getM2MToken()
  const { body: job } = await request.get(`${config.TAAS_API_URL}/jobs/${jobId}`)
    .set('Authorization', `Bearer ${token}`)
  return job
}

module.exports = {
  getKafkaOptions,
  getJobById,
  getM2MToken,
  postMessageViaWebhook
}
