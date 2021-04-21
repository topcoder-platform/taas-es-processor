const Joi = require('@hapi/joi')
const config = require('config')
const _ = require('lodash')
const { Interview } = require('../src/common/constants')
const constants = require('./common/constants')

const allowedInterviewStatuses = _.values(Interview.Status)

global.Promise = require('bluebird')

Joi.rateType = () => Joi.string().valid('hourly', 'daily', 'weekly', 'monthly')
Joi.jobStatus = () => Joi.string().valid('sourcing', 'in-review', 'assigned', 'closed', 'cancelled')
Joi.jobCandidateStatus = () => Joi.string().valid('open', 'selected', 'shortlist', 'rejected', 'cancelled', 'interview', 'topcoder-rejected')
Joi.workload = () => Joi.string().valid('full-time', 'fractional')
Joi.title = () => Joi.string().max(128)
Joi.paymentStatus = () => Joi.string().valid('pending', 'partially-completed', 'completed', 'cancelled')
Joi.interviewStatus = () => Joi.string().valid(...allowedInterviewStatuses)
// Empty string is not allowed by Joi by default and must be enabled with allow('').
// See https://joi.dev/api/?v=17.3.0#string fro details why it's like this.
// In many cases we would like to allow empty string to make it easier to create UI for editing data.
Joi.stringAllowEmpty = () => Joi.string().allow('')

const zapierSwitch = Joi.string().label('ZAPIER_SWITCH').valid(...Object.values(constants.Zapier.Switch))

// validate configuration
try {
  Joi.attempt(config.zapier.ZAPIER_SWITCH, zapierSwitch)
  Joi.attempt(config.zapier.ZAPIER_JOB_CANDIDATE_SWITCH, zapierSwitch)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
