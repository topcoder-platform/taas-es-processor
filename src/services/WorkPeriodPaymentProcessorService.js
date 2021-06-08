/**
 * WorkPeriodPayment Processor Service
 */

const Joi = require('@hapi/joi')
const config = require('config')
const _ = require('lodash')
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
  const data = message.payload
  // find related resourceBooking
  const result = await esClient.search({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    body: {
      query: {
        nested: {
          path: 'workPeriods',
          query: {
            match: { 'workPeriods.id': data.workPeriodId }
          }
        }
      }
    }
  })
  if (!result.body.hits.total.value) {
    throw new Error(`id: ${data.workPeriodId} "WorkPeriod" not found`)
  }
  const resourceBooking = result.body.hits.hits[0]._source
  // find related workPeriod record
  const workPeriod = _.find(resourceBooking.workPeriods, ['id', data.workPeriodId])
  // Get workPeriod's existing payments
  const payments = _.isArray(workPeriod.payments) ? workPeriod.payments : []
  // Append new payment
  payments.push(data)
  // Assign new payments array to workPeriod
  workPeriod.payments = payments
  // Update ResourceBooking's workPeriods property
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    id: resourceBooking.id,
    transactionId,
    body: {
      doc: { workPeriods: resourceBooking.workPeriods }
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
    payload: Joi.object().keys({
      id: Joi.string().uuid().required(),
      workPeriodId: Joi.string().uuid().required(),
      challengeId: Joi.string().uuid().allow(null),
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
  let result = await esClient.search({
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
  if (!result.body.hits.total.value) {
    throw new Error(`id: ${data.id} "WorkPeriodPayment" not found`)
  }
  const resourceBooking = _.cloneDeep(result.body.hits.hits[0]._source)
  let workPeriod = null
  let payment = null
  let paymentIndex = null
  // find workPeriod and workPeriodPayment records
  _.forEach(resourceBooking.workPeriods, wp => {
    _.forEach(wp.payments, (p, pi) => {
      if (p.id === data.id) {
        payment = p
        paymentIndex = pi
        return false
      }
    })
    if (payment) {
      workPeriod = wp
      return false
    }
  })
  let payments
  // if WorkPeriodPayment's workPeriodId changed then it must be deleted from the old WorkPeriod
  // and added to the new WorkPeriod
  if (payment.workPeriodId !== data.workPeriodId) {
    // remove payment from payments
    payments = _.filter(workPeriod.payments, p => p.id !== data.id)
    // assign payments to workPeriod record
    workPeriod.payments = payments
    // Update old ResourceBooking's workPeriods property
    await esClient.updateExtra({
      index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
      id: resourceBooking.id,
      transactionId,
      body: {
        doc: { workPeriods: resourceBooking.workPeriods }
      },
      refresh: constants.esRefreshOption
    })
    // find workPeriodPayment's new parent WorkPeriod
    result = await esClient.search({
      index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
      body: {
        query: {
          nested: {
            path: 'workPeriods',
            query: {
              match: { 'workPeriods.id': data.workPeriodId }
            }
          }
        }
      }
    })
    const newResourceBooking = result.body.hits.hits[0]._source
    // find WorkPeriod record in ResourceBooking
    const newWorkPeriod = _.find(newResourceBooking.workPeriods, ['id', data.workPeriodId])
    // Get WorkPeriod's existing payments
    const newPayments = _.isArray(newWorkPeriod.payments) ? newWorkPeriod.payments : []
    // Append new payment
    newPayments.push(data)
    // Assign new payments array to workPeriod
    newWorkPeriod.payments = newPayments
    // Update new ResourceBooking's workPeriods property
    await esClient.updateExtra({
      index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
      id: newResourceBooking.id,
      transactionId,
      body: {
        doc: { workPeriods: newResourceBooking.workPeriods }
      },
      refresh: constants.esRefreshOption
    })
    return
  }
  // update payment record
  workPeriod.payments[paymentIndex] = data
  // Update ResourceBooking's workPeriods property
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    id: resourceBooking.id,
    transactionId,
    body: {
      doc: { workPeriods: resourceBooking.workPeriods }
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
