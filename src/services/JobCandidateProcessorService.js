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
      status: Joi.jobCandidateStatus().required()
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
