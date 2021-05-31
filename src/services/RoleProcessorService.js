/**
 * Role Processor Service
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
  const role = message.payload
  await esClient.createExtra({
    index: config.get('esConfig.ES_INDEX_ROLE'),
    id: role.id,
    transactionId,
    body: role,
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
      name: Joi.string().max(50).required(),
      description: Joi.string().max(1000).allow(null),
      listOfSkills: Joi.array().items(Joi.string().max(50).required()).allow(null),
      rates: Joi.array().items(Joi.object().keys({
        global: Joi.smallint().required(),
        inCountry: Joi.smallint().required(),
        offShore: Joi.smallint().required(),
        rate30Global: Joi.smallint().allow(null),
        rate30InCountry: Joi.smallint().allow(null),
        rate30OffShore: Joi.smallint().allow(null),
        rate20Global: Joi.smallint().allow(null),
        rate20InCountry: Joi.smallint().allow(null),
        rate20OffShore: Joi.smallint().allow(null)
      }).required()).required(),
      numberOfMembers: Joi.number().allow(null),
      numberOfMembersAvailable: Joi.smallint().allow(null),
      imageUrl: Joi.string().uri().max(255).allow(null),
      timeToCandidate: Joi.smallint().allow(null),
      timeToInterview: Joi.smallint().allow(null),
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
    index: config.get('esConfig.ES_INDEX_ROLE'),
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
    index: config.get('esConfig.ES_INDEX_ROLE'),
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

logger.buildService(module.exports, 'RoleProcessorService')
