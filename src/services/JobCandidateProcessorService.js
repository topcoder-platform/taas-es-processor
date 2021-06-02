/**
 * Jobcandidate Processor Service
 */

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
async function updateCandidateStatus ({ type, payload, previousData }) {
  if (previousData.status === payload.status) {
    localLogger.debug({ context: 'updateCandidateStatus', message: `jobCandidate is already in status: ${payload.status}` })
    return
  }
  // if (!['rejected', 'shortlist',].includes(payload.status)) {
  if (!['client rejected - screening', 'client rejected - interview', 'interview', 'selected'].includes(payload.status)) {
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
async function postMessageToZapier ({ type, payload, previousData }) {
  if (config.zapier.ZAPIER_JOB_CANDIDATE_SWITCH === constants.Zapier.Switch.OFF) {
    localLogger.debug({ context: 'postMessageToZapier', message: 'Zapier Switch off via config, no messages sent' })
    return
  }
  if (type === constants.Zapier.MessageType.JobCandidateUpdate) {
    await updateCandidateStatus({ type, payload, previousData })
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
    body: jobcandidate,
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
      updatedAt: Joi.date().allow(null),
      updatedBy: Joi.string().uuid().allow(null),
      status: Joi.jobCandidateStatus().required(),
      externalId: Joi.string().allow(null),
      resume: Joi.string().uri().allow(null),
      remark: Joi.string().allow(null)
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
  // save previous data for Zapier logic
  // NOTE: ideally if we update Kafka event message to have both: pervious and updated value so we don't have to request it again
  const { body: previousData } = await esClient.getExtra({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    id: data.id
  })
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    id: data.id,
    transactionId,
    body: {
      doc: data
    },
    refresh: constants.esRefreshOption
  })
  await postMessageToZapier({
    type: constants.Zapier.MessageType.JobCandidateUpdate,
    payload: data,
    previousData
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
