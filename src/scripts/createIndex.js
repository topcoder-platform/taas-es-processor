/**
 * Create index in Elasticsearch
 */

const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')

async function createIndex () {
  const esClient = helper.getESClient()

  const indices = [
    {
      index: config.get('esConfig.ES_INDEX_JOB'),
      body: {
        mappings: {
          properties: {
            projectId: { type: 'integer' },
            externalId: { type: 'keyword' },
            description: { type: 'text' },
            title: { type: 'text' },
            startDate: { type: 'date' },
            duration: { type: 'integer' },
            numPositions: { type: 'integer' },
            resourceType: { type: 'keyword' },
            rateType: { type: 'keyword' },
            workload: { type: 'keyword' },
            skills: { type: 'keyword' },
            roles: { type: 'keyword' },
            status: { type: 'keyword' },
            isApplicationPageActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            createdBy: { type: 'keyword' },
            updatedAt: { type: 'date' },
            updatedBy: { type: 'keyword' }
          }
        }
      }
    },
    {
      index: config.get('esConfig.ES_INDEX_JOB_CANDIDATE'),
      body: {
        mappings: {
          properties: {
            jobId: { type: 'keyword' },
            userId: { type: 'keyword' },
            status: { type: 'keyword' },
            externalId: { type: 'keyword' },
            resume: { type: 'text' },
            interviews: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                xaiId: { type: 'keyword' },
                jobCandidateId: { type: 'keyword' },
                calendarEventId: { type: 'keyword' },
                templateUrl: { type: 'keyword' },
                templateId: { type: 'keyword' },
                templateType: { type: 'keyword' },
                title: { type: 'keyword' },
                locationDetails: { type: 'keyword' },
                duration: { type: 'integer' },
                startTimestamp: { type: 'date' },
                endTimestamp: { type: 'date' },
                hostName: { type: 'keyword' },
                hostEmail: { type: 'keyword' },
                guestNames: { type: 'keyword' },
                guestEmails: { type: 'keyword' },
                round: { type: 'integer' },
                status: { type: 'keyword' },
                rescheduleUrl: { type: 'keyword' },
                createdAt: { type: 'date' },
                createdBy: { type: 'keyword' },
                updatedAt: { type: 'date' },
                updatedBy: { type: 'keyword' },
                deletedAt: { type: 'date' }
              }
            },
            createdAt: { type: 'date' },
            createdBy: { type: 'keyword' },
            updatedAt: { type: 'date' },
            updatedBy: { type: 'keyword' }
          }
        }
      }
    },
    {
      index: config.get('esConfig.ES_INDEX_RESOURCE_BOOKING'),
      body: {
        mappings: {
          properties: {
            projectId: { type: 'integer' },
            userId: { type: 'keyword' },
            jobId: { type: 'keyword' },
            status: { type: 'keyword' },
            startDate: { type: 'date', format: 'yyyy-MM-dd' },
            endDate: { type: 'date', format: 'yyyy-MM-dd' },
            memberRate: { type: 'float' },
            customerRate: { type: 'float' },
            rateType: { type: 'keyword' },
            billingAccountId: { type: 'integer' },
            workPeriods: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                resourceBookingId: { type: 'keyword' },
                userHandle: { type: 'keyword' },
                projectId: { type: 'integer' },
                userId: { type: 'keyword' },
                startDate: { type: 'date', format: 'yyyy-MM-dd' },
                endDate: { type: 'date', format: 'yyyy-MM-dd' },
                daysWorked: { type: 'integer' },
                memberRate: { type: 'float' },
                customerRate: { type: 'float' },
                paymentStatus: { type: 'keyword' },
                payments: {
                  type: 'nested',
                  properties: {
                    id: { type: 'keyword' },
                    workPeriodId: { type: 'keyword' },
                    challengeId: { type: 'keyword' },
                    amount: { type: 'float' },
                    status: { type: 'keyword' },
                    billingAccountId: { type: 'integer' },
                    createdAt: { type: 'date' },
                    createdBy: { type: 'keyword' },
                    updatedAt: { type: 'date' },
                    updatedBy: { type: 'keyword' }
                  }
                },
                createdAt: { type: 'date' },
                createdBy: { type: 'keyword' },
                updatedAt: { type: 'date' },
                updatedBy: { type: 'keyword' }
              }
            },
            createdAt: { type: 'date' },
            createdBy: { type: 'keyword' },
            updatedAt: { type: 'date' },
            updatedBy: { type: 'keyword' }
          }
        }
      }
    }
  ]

  for (const index of indices) {
    await esClient.indices.create(index)
    logger.info({ component: 'createIndex', message: `ES Index ${index.index} creation succeeded!` })
  }
  process.exit(0)
}

createIndex().catch((err) => {
  logger.logFullError(err, { component: 'createIndex' })
  process.exit(1)
})
