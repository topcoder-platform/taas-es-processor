const config = require('config')
const superagent = require('superagent')
const logger = require('../common/logger')

const localLogger = {
    debug: ({ context, message }) => logger.debug({ component: 'JobProcessorService', context, message })
}

/**
 * Creates job in RCRM
 * 
 * @param {*} job Job Payload
 */
async function createJob(job) {
    const custom_fields = []

    if (job.duration) {
        custom_fields.push({
            field_id: config.RCRM.CREATE_JOB_FIELD_DURATION,
            value: job.duration
        })
    }

    if (job.skills) {
        custom_fields.push({
            field_id: config.RCRM.CREATE_JOB_FIELD_SKILLS,
            value: job.skills.map(skill => skill.name).join(',')
        })
    }

    if (job.projectId) {
        custom_fields.push({
            field_id: config.RCRM.CREATE_JOB_FIELD_CONNECT_LINK,
            value: `https://connect.${config.TC_DOMAIN}/projects/${job.projectId}`
        })
    }

    try {
        const data = await new Promise((resolve, reject) => {
            superagent
                .post(`${config.RCRM.API_BASE}/jobs`)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Authorization', `Bearer ${config.RCRM.API_KEY}`)
                .send({
                    name: job.title,
                    number_of_openings: job.numPositions,
                    company_slug: config.RCRM.COMPANY_SLUG,
                    contact_slug: config.RCRM.CONTACT_SLUG,
                    job_description_text: job.description,
                    currency_id: 2,
                    custom_fields,
                    enable_job_application_form: 0
                })
                .end((error, res) => {
                    error ? reject(error) : resolve(res);
                });
        })

        localLogger.debug({ context: 'processCreate:add-job to RCRM done', message: JSON.stringify(data) });
    } catch (error) {
        localLogger.debug({ context: 'processCreate', message: error.message || error.toString() })
    }
}

module.exports = {
    createJob
}

logger.buildService(module.exports, 'RCRMService')
