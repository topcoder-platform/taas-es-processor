const Joi = require('@hapi/joi')
const config = require('config')
const _ = require('lodash')
const { Interview } = require('../src/common/constants')
const constants = require('./common/constants')

const allowedXAITemplates = _.values(Interview.XaiTemplate)
const allowedInterviewStatuses = _.values(Interview.Status)

global.Promise = require('bluebird')

Joi.rateType = () => Joi.string().valid('hourly', 'daily', 'weekly', 'monthly')
Joi.jobStatus = () => Joi.string().valid('sourcing', 'in-review', 'assigned', 'closed', 'cancelled')
Joi.resourceBookingStatus = () => Joi.string().valid('placed', 'closed', 'cancelled')
Joi.jobCandidateStatus = () => Joi.string().valid('open', 'placed', 'selected', 'client rejected - screening', 'client rejected - interview', 'rejected - other', 'cancelled', 'interview', 'topcoder-rejected', 'applied', 'rejected-pre-screen', 'skills-test', 'skills-test', 'phone-screen', 'job-closed', 'offered')
Joi.workload = () => Joi.string().valid('full-time', 'fractional')
Joi.title = () => Joi.string().max(128)
Joi.paymentStatus = () => Joi.string().valid('pending', 'partially-completed', 'completed', 'cancelled')
Joi.xaiTemplate = () => Joi.string().valid(...allowedXAITemplates)
Joi.interviewStatus = () => Joi.string().valid(...allowedInterviewStatuses)
Joi.workPeriodPaymentStatus = () => Joi.string().valid('completed', 'cancelled')
// Empty string is not allowed by Joi by default and must be enabled with allow('').
// See https://joi.dev/api/?v=17.3.0#string fro details why it's like this.
// In many cases we would like to allow empty string to make it easier to create UI for editing data.
Joi.stringAllowEmpty = () => Joi.string().allow('')
Joi.smallint = () => Joi.number().min(-32768).max(32767)

const zapierSwitch = Joi.string().label('ZAPIER_SWITCH').valid(...Object.values(constants.Zapier.Switch))

// validate configuration
try {
  Joi.attempt(config.zapier.ZAPIER_SWITCH, zapierSwitch)
  Joi.attempt(config.zapier.ZAPIER_JOB_CANDIDATE_SWITCH, zapierSwitch)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
