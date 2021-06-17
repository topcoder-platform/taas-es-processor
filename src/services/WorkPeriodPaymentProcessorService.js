/**
 * WorkPeriodPayment Processor Service
 */

const Joi = require('@hapi/joi')
const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')
const constants = require('../common/constants')

const esClient = helper.getESClient()

/**
  * Process create entity message
  * @param {Object} message the kafka message
  * @param {String} transactionId
  */
async function processCreate (message, transactionId) {
  const workPeriodPayment = message.payload
  // find related resourceBooking
  const resourceBooking = await esClient.search({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    body: {
      query: {
        nested: {
          path: 'workPeriods',
          query: {
            match: { 'workPeriods.id': workPeriodPayment.workPeriodId }
          }
        }
      }
    }
  })
  if (!resourceBooking.body.hits.total.value) {
    throw new Error(`id: ${workPeriodPayment.workPeriodId} "WorkPeriod" not found`)
  }
  await esClient.update({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    id: resourceBooking.body.hits.hits[0]._id,
    transactionId,
    body: {
      script: {
        lang: 'painless',
        source: 'def wp = ctx._source.workPeriods.find(workPeriod -> workPeriod.id == params.workPeriodPayment.workPeriodId); if(!wp.containsKey("payments") || wp.payments == null){wp["payments"]=[]}wp.payments.add(params.workPeriodPayment)',
        params: { workPeriodPayment }
      }
    },
    refresh: constants.esRefreshOption
  })
}

processCreate.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    key: Joi.string().allow(null),
    payload: Joi.object().keys({
      id: Joi.string().uuid().required(),
      workPeriodId: Joi.string().uuid().required(),
      challengeId: Joi.string().uuid().allow(null),
      memberRate: Joi.number().required(),
      customerRate: Joi.number().allow(null),
      days: Joi.number().integer().min(1).max(5).required(),
      amount: Joi.number().greater(0).allow(null),
      status: Joi.workPeriodPaymentStatus().required(),
      billingAccountId: Joi.number().allow(null),
      statusDetails: Joi.object().keys({
        errorMessage: Joi.string().required(),
        errorCode: Joi.number().integer().allow(null),
        retry: Joi.number().integer().allow(null),
        step: Joi.string().allow(null),
        challengeId: Joi.string().uuid().allow(null)
      }).unknown(true).allow(null),
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
  // find workPeriodPayment in it's parent ResourceBooking
  const resourceBooking = await esClient.search({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    body: {
      query: {
        nested: {
          path: 'workPeriods.payments',
          query: {
            match: { 'workPeriods.payments.id': data.id }
          }
        }
      }
    }
  })
  if (!resourceBooking.body.hits.total.value) {
    throw new Error(`id: ${data.id} "WorkPeriodPayment" not found`)
  }
  await esClient.update({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    id: resourceBooking.body.hits.hits[0]._id,
    transactionId,
    body: {
      script: {
        lang: 'painless',
        source: 'def wp = ctx._source.workPeriods.find(workPeriod -> workPeriod.id == params.data.workPeriodId); wp.payments.removeIf(payment -> payment.id == params.data.id); wp.payments.add(params.data)',
        params: { data }
      }
    },
    refresh: constants.esRefreshOption
  })
}

processUpdate.schema = processCreate.schema

module.exports = {
  processCreate,
  processUpdate
}

logger.buildService(module.exports, 'WorkPeriodPaymentProcessorService')
