/**
 * Jobcandidate Processor Service
 */

const Joi = require('joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const constants = require('../common/constants')
const config = require('config')

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
  // if (!['rejected', 'shortlist',].includes(payload.status)) {
  if (!['client rejected - screening', 'client rejected - interview', 'interview', 'selected', 'withdrawn', 'withdrawn-prescreen'].includes(payload.status)) {
    localLogger.debug({ context: 'updateCandidateStatus', message: `not interested status: ${payload.status}` })
    return
  }
  const jobCandidate = payload

  if (!jobCandidate.externalId) {
    localLogger.debug({ context: 'updateCandidateStatus', message: `id: ${jobCandidate.id} candidate without externalId - ignored` })
    return
  }

  const job = await helper.getJobById(jobCandidate.jobId)

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
 * Process update entity message
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processUpdate (message, transactionId) {
  const data = message.payload

  await postMessageToZapier({
    type: constants.Zapier.MessageType.JobCandidateUpdate,
    payload: data
  })
}

processUpdate.schema = Joi.object()
  .keys({
    message: Joi.object()
      .keys({
        topic: Joi.string().required(),
        originator: Joi.string().required(),
        timestamp: Joi.date().required(),
        'mime-type': Joi.string().required(),
        key: Joi.string().allow(null),
        payload: Joi.object()
          .keys({
            id: Joi.string().uuid().required(),
            jobId: Joi.string().uuid().required(),
            userId: Joi.string().required(),
            createdAt: Joi.date().required(),
            createdBy: Joi.string().required(),
            updatedAt: Joi.date().allow(null),
            viewedByCustomer: Joi.boolean().required(),
            updatedBy: Joi.string().allow(null),
            status: Joi.jobCandidateStatus().required(),
            externalId: Joi.string().allow(null),
            resume: Joi.string().uri().allow(null).allow(''),
            remark: Joi.stringAllowEmpty().allow(null)
          })
          .required()
      })
      .required(),
    transactionId: Joi.string().required()
  })

module.exports = {
  processUpdate
}

logger.buildService(module.exports, 'JobCandidateProcessorService')
