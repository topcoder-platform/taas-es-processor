/**
 * View ES data.
 */

const helper = require('../common/helper')
const logger = require('../common/logger')
const config = require('config')

const esClient = helper.getESClient()

const modelIndexMapping = {
  Job: 'ES_INDEX_JOB',
  JobCandidate: 'ES_INDEX_JOB_CANDIDATE',
  ResourceBooking: 'ES_INDEX_RESOURCE_BOOKING',
  Role: 'ES_INDEX_ROLE'
}

async function showESData () {
  if (process.argv.length < 3) {
    throw new Error('You must specify a model name. Usage: npm run view-data [modelName]')
  }
  const modelName = process.argv[2]
  if (!modelIndexMapping[modelName]) {
    throw new Error(`Model name must be one of ${Object.keys(modelIndexMapping)}`)
  }
  const result = await esClient.search({
    index: config.get(`esConfig.${modelIndexMapping[modelName]}`)
  })
  return result.body.hits.hits.map((doc) => doc._source)
}

showESData()
  .then(result => {
    console.log(
      JSON.stringify(result, null, 2)
    )
    process.exit()
  })
  .catch(err => {
    logger.logFullError(err, { component: 'view-data' })
    process.exit(1)
  })
