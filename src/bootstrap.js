const Joi = require('@hapi/joi')
const config = require('config')
const constants = require('./common/constants')

global.Promise = require('bluebird')

Joi.rateType = () => Joi.string().valid('hourly', 'daily', 'weekly', 'monthly')
Joi.jobStatus = () => Joi.string().valid('sourcing', 'in-review', 'assigned', 'closed', 'cancelled')
Joi.jobCandidateStatus = () => Joi.string().valid('open', 'selected', 'shortlist', 'rejected', 'cancelled')
Joi.workload = () => Joi.string().valid('full-time', 'fractional')
Joi.title = () => Joi.string().max(64)

const zapierSwitch = Joi.string().label('ZAPIER_SWITCH').valid(...Object.values(constants.Zapier.Switch))

// validate configuration
try {
  Joi.attempt(config.zapier.ZAPIER_SWITCH, zapierSwitch)
  Joi.attempt(config.zapier.ZAPIER_JOB_CANDIDATE_SWITCH, zapierSwitch)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
