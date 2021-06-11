/**
 * Interview Processor Service
 */

const Joi = require('@hapi/joi')
const _ = require('lodash')
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
    key: Joi.string().allow(null),
    payload: Joi.object().keys({
      id: Joi.string().uuid().required(),
      xaiId: Joi.string().allow(null),
      jobCandidateId: Joi.string().uuid().required(),
      calendarEventId: Joi.string().allow(null),
      templateUrl: Joi.xaiTemplate().required(),
      templateId: Joi.string().allow(null),
      templateType: Joi.string().allow(null),
      title: Joi.string().allow(null),
      locationDetails: Joi.string().allow(null),
      round: Joi.number().integer().positive().required(),
      duration: Joi.number().integer().positive().required(),
      startTimestamp: Joi.date().allow(null),
      endTimestamp: Joi.date().allow(null),
      hostName: Joi.string().required(),
      hostEmail: Joi.string().email().required(),
      guestNames: Joi.array().items(Joi.string()).allow(null),
      guestEmails: Joi.array().items(Joi.string().email()).allow(null),
      status: Joi.interviewStatus().required(),
      rescheduleUrl: Joi.string().allow(null),
      createdAt: Joi.date().required(),
      createdBy: Joi.string().uuid().required(),
      updatedAt: Joi.date().allow(null),
      updatedBy: Joi.string().uuid().allow(null),
      deletedAt: Joi.date().allow(null)
    }).required()
  }).required(),
  transactionId: Joi.string().required()
}

/**
 * Process update interview entity message
 * Updates the interview record under jobCandidate.
 *
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processUpdateInterview (message, transactionId) {
  const interview = message.payload
  // if there's an interview with this id,
  // update it with the payload
  const script = {
    source: `
      if (ctx._source.containsKey("interviews")) {
        def target = ctx._source.interviews.find(i -> i.id == params.interview.id);
        if (target != null) {
          for (prop in params.interview.entrySet()) {
            target[prop.getKey()] = prop.getValue()
          }
        }
      }
    `,
    params: { interview }
  }
  await updateJobCandidateViaScript(interview.jobCandidateId, script, transactionId)
}

processUpdateInterview.schema = processRequestInterview.schema

/**
 * Process bulk (partially) update interviews entity message.
 * Currently supports status, updatedAt and updatedBy fields.
 * Update Joi schema to allow more fields.
 * (implementation should already handle new fields - just updating Joi schema should be enough)
 *
 * payload format:
 * {
 *   "jobCandidateId": {
 *     "interviewId": { ...fields },
 *     "interviewId2": { ...fields },
 *     ...
 *   },
 *   "jobCandidateId2": { // like above... },
 *   ...
 * }
 *
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processBulkUpdateInterviews (message, transactionId) {
  const jobCandidates = message.payload
  // script to update & params
  const script = {
    source: `
      def completedInterviews = params.jobCandidates[ctx._id];
      for (interview in completedInterviews.entrySet()) {
        def interviewId = interview.getKey();
        def affectedFields = interview.getValue();
        def target = ctx._source.interviews.find(i -> i.id == interviewId);
        if (target != null) {
          for (field in affectedFields.entrySet()) {
            target[field.getKey()] = field.getValue();
          }
        }
      }
    `,
    params: { jobCandidates }
  }
  // update interviews
  await esClient.updateByQuery({
    index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
    transactionId,
    body: {
      script,
      query: {
        ids: {
          values: _.keys(jobCandidates)
        }
      }
    },
    refresh: true
  })
}

processBulkUpdateInterviews.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    key: Joi.string().allow(null),
    payload: Joi.object().pattern(
      Joi.string().uuid(), // key - jobCandidateId
      Joi.object().pattern(
        Joi.string().uuid(), // inner key - interviewId
        Joi.object().keys({
          status: Joi.interviewStatus(),
          updatedAt: Joi.date(),
          updatedBy: Joi.string().uuid()
        }) // inner value - affected fields of interview
      ) // value - object containing interviews
    ).min(1) // at least one key - i.e. don't allow empty object
  }).required(),
  transactionId: Joi.string().required()
}

module.exports = {
  processRequestInterview,
  processUpdateInterview,
  processBulkUpdateInterviews
}

logger.buildService(module.exports, 'InterviewProcessorService')
