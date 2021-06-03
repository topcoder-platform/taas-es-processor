/**
 * Action Processor Service
 */

const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const config = require('config')
const _ = require('lodash')

const localLogger = {
  debug: ({ context, message }) => logger.debug({ component: 'ActionProcessorService', context, message })
}

const retryMap = {}

/**
  * Process retry operation message
  * @param {Object} message the kafka message
  * @param {String} transactionId
  */
async function processRetry (message, transactionId) {
  if (message.originator !== config.KAFKA_MESSAGE_ORIGINATOR) {
    localLogger.debug({ context: 'processRetry', message: `originator: ${message.originator} does not match with ${config.KAFKA_MESSAGE_ORIGINATOR} - ignored` })
    return
  }
  const { topicServiceMapping } = require('../app')
  message.topic = message.payload.originalTopic
  message.payload = message.payload.originalPayload
  await topicServiceMapping[message.topic](message, transactionId)
}

processRetry.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      originalTopic: Joi.string().required(),
      originalPayload: Joi.object().required(),
      retry: Joi.number().integer().min(1).required()
    }).required()
  }).required(),
  transactionId: Joi.string().required()
}

/**
  * Analyzes the failed process and sends it to bus api to be received again.
  * @param {String} originalTopic the failed topic name
  * @param {Object} originalPayload the payload
  * @param {String} id the id that was the subject of the operation failed
  */
async function processCreate (originalTopic, originalPayload, id) {
  const retry = _.defaultTo(retryMap[id], 0) + 1
  if (retry > config.MAX_RETRY) {
    localLogger.debug({ context: 'processCreate', message: `retry: ${retry} for ${id} exceeds the max retry: ${config.MAX_RETRY} - ignored` })
    return
  }
  localLogger.debug({ context: 'processCreate', message: `retry: ${retry} for ${id}` })
  retryMap[id] = retry
  const payload = {
    originalTopic,
    originalPayload,
    retry
  }
  setTimeout(async function () {
    await helper.postEvent(config.topics.TAAS_ACTION_RETRY_TOPIC, payload)
  }, 2 ** retry * config.BASE_RETRY_DELAY)
}

processCreate.schema = {
  originalTopic: Joi.string().required(),
  originalPayload: Joi.object().required(),
  id: Joi.string().uuid().required()
}

module.exports = {
  processRetry,
  processCreate
}

logger.buildService(module.exports, 'ActionProcessorService')
