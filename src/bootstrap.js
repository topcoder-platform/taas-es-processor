const Joi = require('@hapi/joi')

global.Promise = require('bluebird')

Joi.rateType = () => Joi.string().valid('hourly', 'daily', 'weekly', 'monthly')
Joi.jobStatus = () => Joi.string().valid('sourcing', 'in-review', 'assigned', 'closed', 'cancelled')
Joi.jobCandidateStatus = () => Joi.string().valid('open', 'selected', 'shortlist', 'rejected')
Joi.workload = () => Joi.string().valid('full-time', 'fractional')
