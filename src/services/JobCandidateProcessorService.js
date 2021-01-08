/**
 * Jobcandidate Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const constants = require('../common/constants')
const config = require('config')

const esClient = helper.getESClient()

const localLogger = {
  debug: ({ context, message }) => logger.debug({ component: 'JobCandidateProcessorService', context, message })
}

/**
 * Update job candidate status in recruit CRM.
 *
 * @param {Object} message the message object
 * @returns {undefined}
 */
async function updateCandidateStatus ({ type, payload }) {
  if (!payload.status) {
    localLogger.debug({ context: 'updateCandidateStatus', message: 'status not updated' })
    return
  }
  if (!['rejected', 'shortlist'].includes(payload.status)) {
    localLogger.debug({ context: 'updateCandidateStatus', message: `not interested status: ${payload.status}` })
    return
  }
  const { body: jobCandidate } = await esClient.getSource({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    id: payload.id
  })
  if (!jobCandidate.externalId) {
    localLogger.debug({ context: 'updateCandidateStatus', message: `id: ${jobCandidate.id} candidate without externalId - ignored` })
    return
  }
  const { body: job } = await esClient.getSource({
    index: config.get('esConfig.ES_INDEX_JOB'),
    id: jobCandidate.jobId
  })
  const message = {
    type,
    status: jobCandidate.status,
    jobCandidateSlug: jobCandidate.externalId,
    jobSlug: job.externalId
  }
  await helper.postMessageViaWebhook(config.zapier.ZAPIER_JOB_CANDIDATE_WEBHOOK, message)
}

/**
 * Post message to zapier for JobCandidate.
 *
 * @param {Object} message the message object
 * @returns {undefined}
 */
async function postMessageToZapier ({ type, payload }) {
  if (config.zapier.ZAPIER_JOB_CANDIDATE_SWITCH === constants.Zapier.Switch.OFF) {
    localLogger.debug({ context: 'postMessageToZapier', message: 'Zapier Switch off via config, no messages sent' })
    return
  }
  if (type === constants.Zapier.MessageType.JobCandidateUpdate) {
    await updateCandidateStatus({ type, payload })
    return
  }
  throw new Error(`unrecognized message type: ${type}`)
}

/**
 * Process create entity message
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processCreate (message, transactionId) {
  const jobcandidate = message.payload
  await esClient.createExtra({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    id: jobcandidate.id,
    transactionId,
    body: _.omit(jobcandidate, 'id'),
    refresh: constants.esRefreshOption
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
      jobId: Joi.string().uuid().required(),
      userId: Joi.string().uuid().required(),
      createdAt: Joi.date().required(),
      createdBy: Joi.string().uuid().required(),
      status: Joi.jobCandidateStatus().required(),
      externalId: Joi.string(),
      resume: Joi.string().uri()
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
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    id: data.id,
    transactionId,
    body: {
      doc: _.omit(data, ['id'])
    },
    refresh: constants.esRefreshOption
  })
  await postMessageToZapier({
    type: constants.Zapier.MessageType.JobCandidateUpdate,
    payload: data
  })
}

processUpdate.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      id: Joi.string().uuid(),
      jobId: Joi.string().uuid(),
      userId: Joi.string().uuid(),
      status: Joi.jobCandidateStatus(),
      externalId: Joi.string(),
      resume: Joi.string().uri(),
      updatedAt: Joi.date(),
      updatedBy: Joi.string().uuid()
    }).required()
  }).required(),
  transactionId: Joi.string().required()
}

/**
 * Process delete entity message
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processDelete (message, transactionId) {
  const id = message.payload.id
  await esClient.deleteExtra({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
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

logger.buildService(module.exports, 'JobCandidateProcessorService')
