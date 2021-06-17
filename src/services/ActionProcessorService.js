/**
 * Action Processor Service
 */

const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const config = require('config')

const localLogger = {
  debug: ({ context, message }) => logger.debug({ component: 'ActionProcessorService', context, message })
}

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
  const retry = message.payload.retry
  message.topic = message.payload.originalTopic
  message.payload = message.payload.originalPayload
  await topicServiceMapping[message.topic](message, transactionId, { retry })
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
  * @param {Number} retry how many times has it been retried
  *
  * @returns {Promise|null} returns Promise which would be resolved when retry event sent to Kafka,
  *                         or `null` if it would not be scheduled
  */
function scheduleRetry (originalTopic, originalPayload, retry) {
  retry = retry + 1
  if (retry > config.MAX_RETRY) {
    localLogger.debug({ context: 'scheduleRetry', message: `retry: ${retry} for topic: ${originalTopic} id: ${originalPayload.id} exceeds the max retry: ${config.MAX_RETRY} - ignored` })
    return
  }

  localLogger.debug({ context: 'scheduleRetry', message: `retry: ${retry} for topic: ${originalTopic} id: ${originalPayload.id}` })

  const payload = {
    originalTopic,
    originalPayload,
    retry
  }

  return helper.sleep(2 ** retry * config.BASE_RETRY_DELAY).then(() =>
    helper.postEvent(config.topics.TAAS_ACTION_RETRY_TOPIC, payload)
  )
}

module.exports = {
  processRetry
}

logger.buildService(module.exports, 'ActionProcessorService')

// we don't want to wrap this method into service wrappers
// because it would transform this method to `async` while we want to keep it sync
module.exports.scheduleRetry = scheduleRetry
