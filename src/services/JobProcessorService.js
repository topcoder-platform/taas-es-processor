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
    body: _.omit(job, 'id'),
    refresh: constants.esRefreshOption
  })
  await helper.postMessageToZapier({
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
      externalId: Joi.string().required(),
      description: Joi.string().required(),
      title: Joi.title().required(),
      startDate: Joi.date().required(),
      endDate: Joi.date().required(),
      numPositions: Joi.number().integer().min(1).required(),
      resourceType: Joi.string().required(),
      rateType: Joi.rateType(),
      workload: Joi.workload(),
      skills: Joi.array().items(Joi.string().uuid()).required(),
      createdAt: Joi.date().required(),
      createdBy: Joi.string().uuid().required(),
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
      doc: _.omit(data, ['id'])
    },
    refresh: constants.esRefreshOption
  })
  await helper.postMessageToZapier({
    type: constants.Zapier.MessageType.JobUpdate,
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
      id: Joi.string().uuid().required(),
      projectId: Joi.number().integer(),
      externalId: Joi.string(),
      description: Joi.string(),
      title: Joi.title(),
      startDate: Joi.date(),
      endDate: Joi.date(),
      numPositions: Joi.number().integer().min(1),
      resourceType: Joi.string(),
      rateType: Joi.rateType(),
      workload: Joi.workload(),
      skills: Joi.array().items(Joi.string().uuid()),
      status: Joi.jobStatus(),
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
