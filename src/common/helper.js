/**
 * Contains generic helper methods
 */

const AWS = require('aws-sdk')
const config = require('config')
const request = require('superagent')
const logger = require('./logger')
const elasticsearch = require('@elastic/elasticsearch')
const _ = require('lodash')
const { Mutex } = require('async-mutex')
const m2mAuth = require('tc-core-library-js').auth.m2m

AWS.config.region = config.esConfig.AWS_REGION

// Elasticsearch client
let esClient
let transactionId
let m2m
// Mutex to ensure that only one elasticsearch action is carried out at any given time
const esClientMutex = new Mutex()
const mutexReleaseMap = {}

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

/**
 * Get ES Client
 * @return {Object} Elasticsearch Client Instance
 */
function getESClient () {
  if (esClient) {
    return esClient
  }
  const host = config.esConfig.HOST
  const cloudId = config.esConfig.ELASTICCLOUD.id

  if (cloudId) {
    // Elastic Cloud configuration
    esClient = new elasticsearch.Client({
      cloud: {
        id: cloudId
      },
      auth: {
        username: config.esConfig.ELASTICCLOUD.username,
        password: config.esConfig.ELASTICCLOUD.password
      }
    })
  } else {
    esClient = new elasticsearch.Client({
      node: host
    })
  }

  // Patch the transport to enable mutex
  esClient.transport.originalRequest = esClient.transport.request
  esClient.transport.request = async (params) => {
    const tId = _.get(params.querystring, 'transactionId')
    params.querystring = _.omit(params.querystring, 'transactionId')
    if (!tId || tId !== transactionId) {
      const release = await esClientMutex.acquire()
      mutexReleaseMap[tId || 'noTransaction'] = release
      transactionId = tId
    }
    try {
      return await esClient.transport.originalRequest(params)
    } finally {
      if (params.method !== 'GET' || !tId) {
        const release = mutexReleaseMap[tId || 'noTransaction']
        delete mutexReleaseMap[tId || 'noTransaction']
        transactionId = undefined
        if (release) {
          release()
        }
      }
    }
  }

  // create document or catch conflict error
  esClient.createExtra = async function (data) {
    try {
      await esClient.create(data)
    } catch (err) {
      if (err.statusCode === 409) {
        throw new Error(`id: ${data.id} "${data.index}" already exists`)
      }
      throw err
    }
  }

  // update document or catch not found error
  esClient.updateExtra = async function (data) {
    try {
      await esClient.update(data)
    } catch (err) {
      if (err.statusCode === 404) {
        throw new Error(`id: ${data.id} "${data.index}" not found`)
      }
      throw err
    }
  }

  // delete document or catch not found error
  esClient.deleteExtra = async function (data) {
    try {
      await esClient.delete(data)
    } catch (err) {
      if (err.statusCode === 404) {
        throw new Error(`id: ${data.id} "${data.index}" not found`)
      }
      throw err
    }
  }

  return esClient
}

/**
 * Ensure the esClient mutex is released
 * @param {String} tId transactionId
 */
function checkEsMutexRelease (tId) {
  if (tId === transactionId) {
    const release = mutexReleaseMap[tId]
    delete mutexReleaseMap[tId]
    transactionId = undefined
    if (release) {
      release()
    }
  }
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

module.exports = {
  getKafkaOptions,
  getESClient,
  checkEsMutexRelease,
  getM2MToken,
  postMessageViaWebhook
}
