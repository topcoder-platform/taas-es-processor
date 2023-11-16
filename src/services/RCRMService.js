const config = require('config')
const request = require('superagent')
const logger = require('../common/logger')
const helper = require('../common/helper')

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
            value: `${job.duration}`
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
        const rcrmRsp = await request
            .post(`${config.RCRM.API_BASE}/jobs`)
            .set('Authorization', `Bearer ${config.RCRM.API_KEY}`)
            .set('accept', 'json')
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

        localLogger.debug({ context: 'createJob in RCRM', message: JSON.stringify(rcrmRsp) })

        // set the external id to taas via API with M2M token
        const token = await helper.getM2MToken()
        const taasRsp = await request
            .patch(`${config.TAAS_API_URL}/jobs`)
            .set('Authorization', `Bearer ${token}`)
            .set('accept', 'json')
            .send({
                externalId: rcrmRsp.body.slug
            })

        localLogger.debug({ context: 'Set id in TaaS ', message: JSON.stringify(taasRsp) })
    } catch (error) {
        console.error('createJob error', error)
    }
}

module.exports = {
    createJob
}

logger.buildService(module.exports, 'RCRMService')
