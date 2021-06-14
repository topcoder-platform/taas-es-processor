/**
 * WorkPeriod Processor Service
 */

const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const constants = require('../common/constants')
const config = require('config')
const _ = require('lodash')
const esClient = helper.getESClient()
const ActionProcessorService = require('../services/ActionProcessorService')

/**
 * Process create entity message
 * @param {Object} message the kafka message
 * @param {String} transactionId
 * @param {Object} options
 */
async function processCreate (message, transactionId, options) {
  const workPeriod = message.payload
  // Find related resourceBooking
  let resourceBooking
  try {
    resourceBooking = await esClient.getExtra({
      index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
      transactionId,
      id: workPeriod.resourceBookingId
    })
  } catch (err) {
    // if resource booking was not found, it may be because
    // it has not yet been created. We should send a retry request.
    if (err.httpStatus === 404) {
      const schedulePromise = ActionProcessorService.scheduleRetry(message.topic, workPeriod, options.retry)
      if (schedulePromise) {
        // as retry was scheduled, log this error as warning
        logger.logFullWarning(err, { component: 'WorkPeriodProcessorService', context: 'processCreate' })
      } else {
        // as retry was not scheduled, then log this error as error
        logger.logFullError(err, { component: 'WorkPeriodProcessorService', context: 'processCreate' })
      }
      return
    } else {
      throw err
    }
  }

  console.log(`[RB value-999] before update: ${JSON.stringify(resourceBooking)}`)
  // Get ResourceBooking's existing workPeriods
  const workPeriods = _.isArray(resourceBooking.body.workPeriods) ? resourceBooking.body.workPeriods : []
  // Append new workPeriod
  workPeriods.push(workPeriod)
  // Update ResourceBooking's workPeriods property
  console.log(`[WP value-999]: ${JSON.stringify(workPeriod)}`)
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    id: workPeriod.resourceBookingId,
    transactionId,
    body: {
      doc: { workPeriods }
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
      resourceBookingId: Joi.string().uuid().required(),
      userHandle: Joi.string().required(),
      projectId: Joi.number().integer().required(),
      startDate: Joi.string().required(),
      endDate: Joi.string().required(),
      daysWorked: Joi.number().integer().min(0).max(5).required(),
      daysPaid: Joi.number().integer().min(0).max(5).required(),
      paymentTotal: Joi.number().min(0).required(),
      paymentStatus: Joi.paymentStatus().required(),
      createdAt: Joi.date().required(),
      createdBy: Joi.string().uuid().required(),
      updatedAt: Joi.date().allow(null),
      updatedBy: Joi.string().uuid().allow(null)
    }).required()
  }).required(),
  transactionId: Joi.string().required(),
  options: Joi.object().keys({
    retry: Joi.number().integer().min(0).default(0)
  }).default({
    retry: 0
  })
}

/**
 * Process update entity message
 * @param {Object} message the kafka message
 * @param {String} transactionId
 */
async function processUpdate (message, transactionId) {
  const data = message.payload
  // find workPeriod in it's parent ResourceBooking
  let resourceBooking = await esClient.search({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    transactionId,
    body: {
      query: {
        nested: {
          path: 'workPeriods',
          query: {
            match: { 'workPeriods.id': data.id }
          }
        }
      }
    }
  })
  if (!resourceBooking.body.hits.total.value) {
    throw new Error(`id: ${data.id} "WorkPeriod" not found`)
  }
  let workPeriods
  // if WorkPeriod's resourceBookingId changed then it must be deleted from the old ResourceBooking
  // and added to the new ResourceBooking
  if (resourceBooking.body.hits.hits[0]._source.id !== data.resourceBookingId) {
    // find old workPeriod record, so we can keep it's existing nested payments field
    let oldWorkPeriod = _.find(resourceBooking.body.hits.hits[0]._source.workPeriods, ['id', data.id])
    // remove workPeriod from it's old parent
    workPeriods = _.filter(resourceBooking.body.hits.hits[0]._source.workPeriods, (workPeriod) => workPeriod.id !== data.id)
    // Update old ResourceBooking's workPeriods property
    await esClient.updateExtra({
      index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
      id: resourceBooking.body.hits.hits[0]._source.id,
      transactionId,
      body: {
        doc: { workPeriods }
      },
      refresh: constants.esRefreshOption
    })
    // find workPeriod's new parent ResourceBooking
    resourceBooking = await esClient.getExtra({
      index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
      transactionId,
      id: data.resourceBookingId
    })
    // Get ResourceBooking's existing workPeriods
    workPeriods = _.isArray(resourceBooking.body.workPeriods) ? resourceBooking.body.workPeriods : []
    // Update workPeriod record
    const newData = _.assign(oldWorkPeriod, data)
    // Append updated workPeriod to workPeriods
    workPeriods.push(newData)
    // Update new ResourceBooking's workPeriods property
    await esClient.updateExtra({
      index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
      id: data.resourceBookingId,
      transactionId,
      body: {
        doc: { workPeriods }
      },
      refresh: constants.esRefreshOption
    })
    return
  }
  // Update workPeriod record
  workPeriods = _.map(resourceBooking.body.hits.hits[0]._source.workPeriods, (workPeriod) => {
    if (workPeriod.id === data.id) {
      return _.assign(workPeriod, data)
    }
    return workPeriod
  })
  // Update ResourceBooking's workPeriods property
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    id: data.resourceBookingId,
    transactionId,
    body: {
      doc: { workPeriods }
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
  const data = message.payload
  // Find related ResourceBooking
  const resourceBooking = await esClient.search({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    transactionId,
    body: {
      query: {
        nested: {
          path: 'workPeriods',
          query: {
            match: { 'workPeriods.id': data.id }
          }
        }
      }
    }
  })
  if (!resourceBooking.body.hits.total.value) {
    throw new Error(`id: ${data.id} "WorkPeriod" not found`)
  }
  // Remove workPeriod from workPeriods
  const workPeriods = _.filter(resourceBooking.body.hits.hits[0]._source.workPeriods, (workPeriod) => workPeriod.id !== data.id)
  // Update ResourceBooking's workPeriods property
  await esClient.updateExtra({
    index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
    id: resourceBooking.body.hits.hits[0]._source.id,
    transactionId,
    body: {
      doc: { workPeriods }
    },
    refresh: constants.esRefreshOption
  })
}

processDelete.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    key: Joi.string().allow(null),
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
