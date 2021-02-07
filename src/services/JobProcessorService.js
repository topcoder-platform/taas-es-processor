/**
 * Job Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const constants = require('../common/constants')
const config = require('config')

const esClient = helper.getESClient()

const localLogger = {
  debug: ({ context, message }) => logger.debug({ component: 'JobProcessorService', context, message })
}

/**
 * Post message to zapier for Job.
 *
 * @param {Object} message the message object
 * @returns {undefined}
 */
async function postMessageToZapier ({ type, payload }) {
  if (config.zapier.ZAPIER_SWITCH === constants.Zapier.Switch.OFF) {
    localLogger.debug({ context: 'postMessageToZapier', message: 'Zapier Switch off via config, no messages sent' })
    return
  }
  const message = {
    type,
    payload,
    companySlug: config.zapier.ZAPIER_COMPANYID_SLUG,
    contactSlug: config.zapier.ZAPIER_CONTACTID_SLUG
  }
  if (type === constants.Zapier.MessageType.JobCreate) {
    const token = await helper.getM2MToken()
    message.authToken = token
    message.topcoderApiUrl = config.zapier.TOPCODER_API_URL
  }
  await helper.postMessageViaWebhook(config.zapier.ZAPIER_WEBHOOK, message)
}

/**
 * Process create entity message
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processCreate (message, transactionId) {
  const job = message.payload
  await esClient.createExtra({
    index: config.get('esConfig.ES_INDEX_JOB'),
    id: job.id,
    transactionId,
    body: job,
    refresh: constants.esRefreshOption
  })
  await postMessageToZapier({
    type: constants.Zapier.MessageType.JobCreate,
    payload: job
  })
}

processCreate.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      id: Joi.string().uuid().required(),
      projectId: Joi.number().integer().required(),
      externalId: Joi.string().allow(null),
      description: Joi.stringAllowEmpty().allow(null),
      title: Joi.title().required(),
      startDate: Joi.date().allow(null),
      endDate: Joi.date().allow(null),
      numPositions: Joi.number().integer().min(1).required(),
      resourceType: Joi.stringAllowEmpty().allow(null),
      rateType: Joi.rateType().allow(null),
      workload: Joi.workload().allow(null),
      skills: Joi.array().items(Joi.string().uuid()).required(),
      createdAt: Joi.date().required(),
      createdBy: Joi.string().uuid().required(),
      updatedAt: Joi.date().allow(null),
      updatedBy: Joi.string().uuid().allow(null),
      status: Joi.jobStatus().required()
    }).required()
  }).required(),
  transactionId: Joi.string().required()
}

/**
 * Process update entity message
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processUpdate (message, transactionId) {
  const data = message.payload
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_JOB'),
    id: data.id,
    transactionId,
    body: {
      doc: data
    },
    refresh: constants.esRefreshOption
  })
  await postMessageToZapier({
    type: constants.Zapier.MessageType.JobUpdate,
    payload: data
  })
}

processUpdate.schema = processCreate.schema

/**
 * Process delete entity message
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processDelete (message, transactionId) {
  const id = message.payload.id
  await esClient.deleteExtra({
    index: config.get('esConfig.ES_INDEX_JOB'),
    id,
    transactionId,
    refresh: constants.esRefreshOption
  })
}

processDelete.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      id: Joi.string().uuid().required()
    }).required()
  }).required(),
  transactionId: Joi.string().required()
}

module.exports = {
  processCreate,
  processUpdate,
  processDelete
}

logger.buildService(module.exports, 'JobProcessorService')
