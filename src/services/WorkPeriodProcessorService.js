/**
 * WorkPeriod Processor Service
 */

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
  const workPeriod = message.payload
  await esClient.createExtra({
    index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
    id: workPeriod.id,
    transactionId,
    body: workPeriod,
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
      resourceBookingId: Joi.string().uuid().required(),
      userHandle: Joi.string().required(),
      projectId: Joi.number().integer().required(),
      startDate: Joi.string().required(),
      endDate: Joi.string().required(),
      daysWorked: Joi.number().integer().min(0).allow(null),
      memberRate: Joi.number().allow(null),
      customerRate: Joi.number().allow(null),
      paymentStatus: Joi.paymentStatus().required(),
      createdAt: Joi.date().required(),
      createdBy: Joi.string().uuid().required(),
      updatedAt: Joi.date().allow(null),
      updatedBy: Joi.string().uuid().allow(null)
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
    index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
    id: data.id,
    transactionId,
    body: {
      doc: data
    },
    refresh: constants.esRefreshOption
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
    index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
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

logger.buildService(module.exports, 'WorkPeriodProcessorService')
