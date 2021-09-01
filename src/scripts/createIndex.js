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
            minSalary: { type: 'integer' },
            maxSalary: { type: 'integer' },
            hoursPerWeek: { type: 'integer' },
            jobLocation: { type: 'keyword' },
            jobTimezone: { type: 'keyword' },
            currency: { type: 'keyword' },
            roleIds: { type: 'keyword' },
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
    await esClient.indices.create({ index: index.index })
    await esClient.indices.close({ index: index.index })
    await esClient.indices.putSettings({
      index: index.index,
      body: {
        settings: {
          analysis: {
            normalizer: {
              lowercaseNormalizer: {
                filter: ['lowercase']
              }
            }
          }
        }
      }
    })
    await esClient.indices.open({ index: index.index })
    await esClient.indices.putMapping({
      index: index.index,
      body: {
        properties: index.body.mappings.properties
      }
    })
    logger.info({ component: 'createIndex', message: `ES Index ${index.index} creation succeeded!` })
  }
  process.exit(0)
}

createIndex().catch((err) => {
  logger.logFullError(err, { component: 'createIndex' })
  process.exit(1)
})
