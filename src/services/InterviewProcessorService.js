/**
 * Interview Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const constants = require('../common/constants')
const config = require('config')

const esClient = helper.getESClient()

/**
 * Updates jobCandidate via a painless script
 *
 * @param {String} jobCandidateId job candidate id
 * @param {String} script script definition
 * @param {String} transactionId transaction id
 */
async function updateJobCandidateViaScript (jobCandidateId, script, transactionId) {
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    id: jobCandidateId,
    transactionId,
    body: { script },
    refresh: constants.esRefreshOption
  })
}

/**
 * Process request interview entity message.
 * Creates an interview record under jobCandidate.
 *
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processRequestInterview (message, transactionId) {
  const interview = message.payload
  // add interview in collection if there's already an existing collection
  // or initiate a new one with this interview
  const script = {
    source: `
      ctx._source.containsKey("interviews")
        ? ctx._source.interviews.add(params.interview)
        : ctx._source.interviews = [params.interview]
    `,
    params: { interview }
  }
  await updateJobCandidateViaScript(interview.jobCandidateId, script, transactionId)
}

processRequestInterview.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      id: Joi.string().uuid().required(),
      jobCandidateId: Joi.string().uuid().required(),
      googleCalendarId: Joi.string().allow(null),
      customMessage: Joi.string().allow(null),
      xaiTemplate: Joi.string().required(),
      round: Joi.number().integer().positive().required(),
      status: Joi.interviewStatus().required(),
      createdAt: Joi.date().required(),
      createdBy: Joi.string().uuid().required(),
      updatedAt: Joi.date().allow(null),
      updatedBy: Joi.string().uuid().allow(null),
      attendeesList: Joi.array().items(Joi.string().email()).allow(null),
      startTimestamp: Joi.date().allow(null)
    }).required()
  }).required(),
  transactionId: Joi.string().required()
}

/**
 * Process update interview entity message.
 * Update an interview record under jobCandidate.
 *
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processUpdateInterview (message, transactionId) {
  const data = message.payload
  const { body: jobCandidate } = await esClient.getExtra({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    id: data.jobCandidateId
  })
  const interviews = jobCandidate.interviews || []
  const index = _.findIndex(interviews, ['id', data.id])
  if (index === -1) {
    interviews.push(data)
  } else {
    interviews.splice(index, 1, data)
  }
  jobCandidate.interviews = interviews
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    id: data.jobCandidateId,
    transactionId,
    body: {
      doc: jobCandidate
    },
    refresh: constants.esRefreshOption
  })
}

processUpdateInterview.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      id: Joi.string().uuid().required(),
      jobCandidateId: Joi.string().uuid().required(),
      googleCalendarId: Joi.string().allow(null),
      customMessage: Joi.string().allow(null),
      xaiTemplate: Joi.string().required(),
      round: Joi.number().integer().positive().required(),
      status: Joi.interviewStatus().required(),
      createdAt: Joi.date().required(),
      createdBy: Joi.string().uuid().required(),
      updatedAt: Joi.date().required(),
      updatedBy: Joi.string().uuid().required(),
      attendeesList: Joi.array().items(Joi.string().email()).allow(null),
      startTimestamp: Joi.date().allow(null)
    }).required()
  }).required(),
  transactionId: Joi.string().required()
}

module.exports = {
  processRequestInterview,
  processUpdateInterview
}

logger.buildService(module.exports, 'InterviewProcessorService')
