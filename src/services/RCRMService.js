const config = require('config')
const fetch = require('node-fetch')
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

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${config.RCRM.API_KEY}`
        },
        body: JSON.stringify({
            name: job.title,
            number_of_openings: job.numPositions,
            company_slug: config.RCRM.COMPANY_SLUG,
            contact_slug: config.RCRM.CONTACT_SLUG,
            job_description_text: job.description,
            currency_id: 2,
            custom_fields,
            enable_job_application_form: 0
        })
    };

    try {
        const rsp = await fetch(`${config.RCRM.API_BASE}/jobs`, options);
        const data = await rsp.json();

        localLogger.debug({ context: 'createJob done', message: JSON.stringify(data) });
    } catch (error) {
        localLogger.debug({ context: 'createJob error', message: error.message || error.toString() })
    }
}

module.exports = {
    createJob
}

logger.buildService(module.exports, 'RCRMService')
