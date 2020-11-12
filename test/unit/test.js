/**
 * Mocha tests of the UBahn ES Processor.
 */

const _ = require('lodash')
const should = require('should')
const config = require('config')
const stringcase = require('stringcase')
const testData = require('../common/testData')
const testHelper = require('../common/testHelper')
const services = {
  JobProcessorService: require('../../src/services/JobProcessorService'),
  JobCandidateProcessorService: require('../../src/services/JobCandidateProcessorService'),
  ResourceBookingProcessorService: require('../../src/services/ResourceBookingProcessorService')
}

describe('UBahn - Elasticsearch Data Processor Unit Test', () => {
  // random transaction id here
  const transactionId = '2023692c-a9d3-4250-86c4-b83f381a5d03'

  after(() => {
    // clear es storage
    testData.esStorage.content = {}
  })

  beforeEach(() => {
    // clear es storage
    testData.esStorage.content = {}
  })

  for (const [index, model] of [
    [config.esConfig.ES_INDEX_JOB, 'Job'],
    [config.esConfig.ES_INDEX_JOB_CANDIDATE, 'JobCandidate'],
    [config.esConfig.ES_INDEX_RESOURCE_BOOKING, 'ResourceBooking']
  ]) {
    const modelInSpaceCase = stringcase.spacecase(model)
    it('processCreate - success', async () => {
      await services[`${model}ProcessorService`].processCreate(testData.messages[model].create.message, transactionId)
      should.deepEqual(
        testData.esStorage.content[testData.messages[model].create.message.payload.id],
        _.omit(testData.messages[model].create.message.payload, ['id'])
      )
    })

    it('processUpdate - success', async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[model].create.message.payload.id,
        body: _.omit(testData.messages[model].create.message.payload, ['id']),
        refresh: 'true'
      })
      await services[`${model}ProcessorService`].processUpdate(testData.messages[model].update.message, transactionId)
      should.deepEqual(
        _.omit(testData.esStorage.content[testData.messages[model].create.message.payload.id], ['createdAt', 'createdBy']),
        _.omit(testData.messages[model].update.message.payload, ['id'])
      )
    })

    it('processDelete - success', async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[model].create.message.payload.id,
        body: _.omit(testData.messages[model].create.message.payload, ['id']),
        refresh: 'true'
      })
      await services[`${model}ProcessorService`].processDelete(testData.messages[model].delete.message, transactionId)
      should.not.exist(testData.esStorage.content[testData.messages[model].create.message.payload.id])
    })

    it(`Failure - processCreate - ${modelInSpaceCase} already exists`, async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[model].create.message.payload.id,
        body: _.omit(testData.messages[model].create.message.payload, ['id']),
        refresh: 'true'
      })
      try {
        await services[`${model}ProcessorService`].processCreate(testData.messages[model].create.message, transactionId)
        throw new Error()
      } catch (err) {
        should.equal(err.message, `id: ${testData.messages[model].create.message.payload.id} "${index}" already exists`)
      }
    })

    it(`Failure - processUpdate - ${modelInSpaceCase} not found`, async () => {
      try {
        await services[`${model}ProcessorService`].processUpdate(testData.messages[model].update.message, transactionId)
        throw new Error()
      } catch (err) {
        should.equal(err.message, `id: ${testData.messages[model].update.message.payload.id} "${index}" not found`)
      }
    })

    it(`Failure - processDelete - ${modelInSpaceCase} not found`, async () => {
      try {
        await services[`${model}ProcessorService`].processDelete(testData.messages[model].delete.message, transactionId)
        throw new Error()
      } catch (err) {
        should.equal(err.message, `id: ${testData.messages[model].delete.message.payload.id} "${index}" not found`)
      }
    })
  }
})
