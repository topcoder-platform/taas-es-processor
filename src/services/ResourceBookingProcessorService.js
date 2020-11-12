/**
 * ResourceBooking Processor Service
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
  const resourcebooking = message.payload
  await esClient.createExtra({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    id: resourcebooking.id,
    transactionId,
    body: _.omit(resourcebooking, 'id'),
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
      projectId: Joi.number().integer().required(),
      userId: Joi.string().uuid().required(),
      jobId: Joi.string().uuid(),
      startDate: Joi.date().required(),
      endDate: Joi.date().required(),
      memberRate: Joi.number().required(),
      customerRate: Joi.number().required(),
      rateType: Joi.rateType().required(),
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
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
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
      id: Joi.string().uuid().required(),
      projectId: Joi.number().integer(),
      userId: Joi.string().uuid(),
      jobId: Joi.string().uuid(),
      startDate: Joi.date(),
      endDate: Joi.date(),
      memberRate: Joi.number(),
      customerRate: Joi.number(),
      rateType: Joi.rateType(),
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
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
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

logger.buildService(module.exports, 'ResourceBookingProcessorService')
