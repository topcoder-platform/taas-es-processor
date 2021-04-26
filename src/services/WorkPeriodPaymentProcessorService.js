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
  const workPeriod = await esClient.getExtra({
    index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
    id: data.workPeriodId
  })
  const payments = _.isArray(workPeriod.body.payments) ? workPeriod.body.payments : []
  payments.push(data)

  return esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
    id: data.workPeriodId,
    transactionId,
    body: {
      doc: _.assign(workPeriod.body, { payments })
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
      challengeId: Joi.string().uuid().required(),
      amount: Joi.number().greater(0).allow(null),
      status: Joi.workPeriodPaymentStatus().required(),
      billingAccountId: Joi.number().allow(null),
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
  let workPeriod = await esClient.search({
    index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
    body: {
      query: {
        nested: {
          path: 'payments',
          query: {
            match: { 'payments.id': data.id }
          }
        }
      }
    }
  })
  if (!workPeriod.body.hits.total.value) {
    throw new Error(`id: ${data.id} "WorkPeriodPayments" not found`)
  }
  let payments
  // if WorkPeriodPayment's workPeriodId changed then it must be deleted from the old WorkPeriod
  // and added to the new WorkPeriod
  if (workPeriod.body.hits.hits[0]._source.id !== data.workPeriodId) {
    payments = _.filter(workPeriod.body.hits.hits[0]._source.payments, (payment) => payment.id !== data.id)
    await esClient.updateExtra({
      index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
      id: workPeriod.body.hits.hits[0]._source.id,
      transactionId,
      body: {
        doc: _.assign(workPeriod.body.hits.hits[0]._source, { payments })
      }
    })
    workPeriod = await esClient.getExtra({
      index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
      id: data.workPeriodId
    })
    payments = _.isArray(workPeriod.body.payments) ? workPeriod.body.payments : []
    payments.push(data)
    return esClient.updateExtra({
      index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
      id: data.workPeriodId,
      transactionId,
      body: {
        doc: _.assign(workPeriod.body, { payments })
      }
    })
  }

  payments = _.map(workPeriod.body.hits.hits[0]._source.payments, (payment) => {
    if (payment.id === data.id) {
      return _.assign(payment, data)
    }
    return payment
  })

  return esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_WORK_PERIOD'),
    id: data.workPeriodId,
    transactionId,
    body: {
      doc: _.assign(workPeriod.body.hits.hits[0]._source, { payments })
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
