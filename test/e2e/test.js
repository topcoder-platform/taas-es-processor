/**
 * E2E test of the Taas ES Processor.
 */

const config = require('config')
const stringcase = require('stringcase')
const app = require('../../src/app')
const request = require('superagent')
const should = require('should')
const logger = require('../../src/common/logger')
const testData = require('../common/testData')
const testHelper = require('../common/testHelper')
const _ = require('lodash')

describe('Taas ES Processor E2E Test', () => {
  let infoLogs = []
  let errorLogs = []
  let debugLogs = []
  const info = logger.info
  const error = logger.error
  const debug = logger.debug
  const waitForMessageHandled = () => new Promise((resolve) => {
    app.eventEmitter.once('end_handling_message', () => resolve())
  })
  before(async () => {
    // inject logger with log collector
    logger.info = (message) => {
      infoLogs.push(message.message || message)
      info(message)
    }
    logger.debug = (message) => {
      debugLogs.push(message.message || message)
      debug(message)
    }
    logger.error = (message) => {
      errorLogs.push(message.message || message)
      error(message)
    }
    await app.initConsumer()
  })

  after(async () => {
    // restore logger
    logger.error = error
    logger.info = info
    logger.debug = debug

    await testHelper.clearES()
  })

  beforeEach(async () => {
    // clear logs
    infoLogs = []
    debugLogs = []
    errorLogs = []
    await testHelper.clearES()
  })
  describe('General Logic Tests', () => {
    it('Should setup healthcheck with check on kafka connection', async () => {
      const healthcheckEndpoint = `http://localhost:${config.PORT}/health`
      const result = await request.get(healthcheckEndpoint)
      should.equal(result.status, 200)
      should.deepEqual(result.body, { checksRun: 1 })
    })

    it('Should handle invalid json message', async () => {
      await testHelper.sendMessage(testData.messages.messageInvalid, config.topics.TAAS_JOB_CREATE_TOPIC)
      await waitForMessageHandled()
      errorLogs[0].should.match(/Invalid message JSON/)
    })

    it('Should handle incorrect topic field message', async () => {
      await testHelper.sendMessage(testData.messages.Job.create.message, config.topics.TAAS_JOB_UPDATE_TOPIC)
      await waitForMessageHandled()
      should.equal(errorLogs[0], `The message topic ${testData.messages.Job.create.topic} doesn't match the Kafka topic ${config.topics.TAAS_JOB_UPDATE_TOPIC}.`)
    })
  })
  describe('Job, JobCandidate, ResourceBooking tests', () => {
    for (const [index, model] of [
      [config.esConfig.ES_INDEX_JOB, 'Job'],
      [config.esConfig.ES_INDEX_JOB_CANDIDATE, 'JobCandidate'],
      [config.esConfig.ES_INDEX_RESOURCE_BOOKING, 'ResourceBooking']
    ]) {
      const modelInSpaceCase = stringcase.spacecase(model)

      it(`Should handle ${modelInSpaceCase} creation message`, async () => {
        await testHelper.sendMessage(testData.messages[model].create.message)
        await waitForMessageHandled()
        const doc = await testHelper.esClient.get({
          index,
          id: testData.messages[model].create.message.payload.id
        })
        should.deepEqual(doc.body._source, testData.messages[model].create.message.payload, ['id'])
      })

      it(`Should handle ${modelInSpaceCase} updating message`, async () => {
        await testHelper.esClient.create({
          index,
          id: testData.messages[model].create.message.payload.id,
          body: testData.messages[model].create.message.payload,
          refresh: 'true'
        })
        await testHelper.sendMessage(testData.messages[model].update.message)
        await waitForMessageHandled()
        const doc = await testHelper.esClient.get({
          index,
          id: testData.messages[model].update.message.payload.id
        })
        should.deepEqual(doc.body._source, testData.messages[model].update.message.payload)
      })

      it(`Should handle ${modelInSpaceCase} deletion message`, async () => {
        await testHelper.esClient.create({
          index,
          id: testData.messages[model].create.message.payload.id,
          body: testData.messages[model].create.message.payload,
          refresh: 'true'
        })
        await testHelper.sendMessage(testData.messages[model].delete.message)
        await waitForMessageHandled()
        const doc = await testHelper.esClient.get({
          index,
          id: testData.messages[model].delete.message.payload.id
        }).catch(err => {
          if (err.statusCode === 404) {
            return
          }
          throw err
        })
        should.not.exist(doc)
      })

      it(`Failure - creation message - ${modelInSpaceCase} already exists`, async () => {
        await testHelper.esClient.create({
          index,
          id: testData.messages[model].create.message.payload.id,
          body: testData.messages[model].create.message.payload,
          refresh: 'true'
        })
        await testHelper.sendMessage(testData.messages[model].create.message)
        await waitForMessageHandled()
        should.equal(errorLogs[0], `id: ${testData.messages[model].create.message.payload.id} "${index}" already exists`)
      })

      it(`Failure - updating message - ${modelInSpaceCase} not found`, async () => {
        await testHelper.sendMessage(testData.messages[model].update.message)
        await waitForMessageHandled()
        should.equal(errorLogs[0], `id: ${testData.messages[model].update.message.payload.id} "${index}" not found`)
      })

      it(`Failure - deletion message - ${modelInSpaceCase} not found`, async () => {
        await testHelper.sendMessage(testData.messages[model].delete.message)
        await waitForMessageHandled()
        should.equal(errorLogs[0], `id: ${testData.messages[model].delete.message.payload.id} "${index}" not found`)
      })
    }
  })
  describe('Nested WorkPeriod tests', () => {
    const index = config.esConfig.ES_INDEX_RESOURCE_BOOKING
    const model = 'WorkPeriod'
    const parentModel = 'ResourceBooking'
    const nestedName = 'workPeriods'
    const modelInSpaceCase = stringcase.spacecase(model)

    it(`Should handle ${modelInSpaceCase} creation message`, async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[parentModel].create.message.payload.id,
        body: testData.messages[parentModel].create.message.payload,
        refresh: 'true'
      })
      await testHelper.sendMessage(testData.messages[model].create.message)
      await waitForMessageHandled()
      const doc = await testHelper.esClient.get({
        index,
        id: testData.messages[parentModel].create.message.payload.id
      })
      should.deepEqual(doc.body._source,
        _.assign(testData.messages[parentModel].create.message.payload, { [nestedName]: [testData.messages[model].create.message.payload] }))
    })

    it(`Should handle ${modelInSpaceCase} updating message`, async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[parentModel].create.message.payload.id,
        body: _.assign(testData.messages[parentModel].create.message.payload, { [nestedName]: [testData.messages[model].create.message.payload] }),
        refresh: 'true'
      })
      await testHelper.sendMessage(testData.messages[model].update.message)
      await waitForMessageHandled()
      const doc = await testHelper.esClient.get({
        index,
        id: testData.messages[parentModel].create.message.payload.id
      })
      should.deepEqual(doc.body._source,
        _.assign(testData.messages[parentModel].create.message.payload, { [nestedName]: [testData.messages[model].update.message.payload] }))
    })

    it(`Should handle ${modelInSpaceCase} deletion message`, async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[parentModel].create.message.payload.id,
        body: _.assign(testData.messages[parentModel].create.message.payload, { [nestedName]: [testData.messages[model].create.message.payload] }),
        refresh: 'true'
      })
      await testHelper.sendMessage(testData.messages[model].delete.message)
      await waitForMessageHandled()
      const doc = await testHelper.esClient.get({
        index,
        id: testData.messages[parentModel].create.message.payload.id
      })
      should.deepEqual(doc.body._source,
        _.assign(testData.messages[parentModel].create.message.payload, { [nestedName]: [] }))
    })

    it(`Failure - creation message - ${modelInSpaceCase} not found`, async () => {
      await testHelper.sendMessage(testData.messages[model].create.message)
      await waitForMessageHandled()
      should.equal(errorLogs[0], `id: ${testData.messages[parentModel].create.message.payload.id} "${index}" not found`)
    })

    it(`Failure - updating message - ${modelInSpaceCase} not found`, async () => {
      await testHelper.sendMessage(testData.messages[model].update.message)
      await waitForMessageHandled()
      should.equal(errorLogs[0], `id: ${testData.messages[model].update.message.payload.id} "${model}" not found`)
    })

    it(`Failure - deletion message - ${modelInSpaceCase} not found`, async () => {
      await testHelper.sendMessage(testData.messages[model].delete.message)
      await waitForMessageHandled()
      should.equal(errorLogs[0], `id: ${testData.messages[model].delete.message.payload.id} "${model}" not found`)
    })
  })
  describe('Nested WorkPeriodPayment tests', () => {
    const index = config.esConfig.ES_INDEX_RESOURCE_BOOKING
    const model = 'WorkPeriodPayment'
    const parentModel = 'WorkPeriod'
    const rootModel = 'ResourceBooking'
    const nestedName = 'payments'
    const parentNestedName = 'workPeriods'
    const modelInSpaceCase = stringcase.spacecase(model)

    it(`Should handle ${modelInSpaceCase} creation message`, async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[rootModel].create.message.payload.id,
        body: _.assign(testData.messages[rootModel].create.message.payload, { [parentNestedName]: [testData.messages[parentModel].create.message.payload] }),
        refresh: 'true'
      })
      await testHelper.sendMessage(testData.messages[model].create.message)
      await waitForMessageHandled()
      const doc = await testHelper.esClient.get({
        index,
        id: testData.messages[rootModel].create.message.payload.id
      })
      should.deepEqual(doc.body._source, _.assign(testData.messages[rootModel].create.message.payload, { [parentNestedName]: [_.assign(testData.messages[parentModel].create.message.payload, { [nestedName]: [testData.messages[model].create.message.payload] })] }))
    })

    it(`Should handle ${modelInSpaceCase} updating message`, async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[rootModel].create.message.payload.id,
        body: _.assign(testData.messages[rootModel].create.message.payload, { [parentNestedName]: [_.assign(testData.messages[parentModel].create.message.payload, { [nestedName]: [testData.messages[model].create.message.payload] })] }),
        refresh: 'true'
      })
      await testHelper.sendMessage(testData.messages[model].update.message)
      await waitForMessageHandled()
      const doc = await testHelper.esClient.get({
        index,
        id: testData.messages[rootModel].create.message.payload.id
      })
      should.deepEqual(doc.body._source, _.assign(testData.messages[rootModel].create.message.payload, { [parentNestedName]: [_.assign(testData.messages[parentModel].create.message.payload, { [nestedName]: [testData.messages[model].update.message.payload] })] }))
    })

    it(`Failure - creation message - ${modelInSpaceCase} not found`, async () => {
      await testHelper.sendMessage(testData.messages[model].create.message)
      await waitForMessageHandled()
      should.equal(errorLogs[0], `id: ${testData.messages[parentModel].create.message.payload.id} "${parentModel}" not found`)
    })

    it(`Failure - updating message - ${modelInSpaceCase} not found`, async () => {
      await testHelper.sendMessage(testData.messages[model].update.message)
      await waitForMessageHandled()
      should.equal(errorLogs[0], `id: ${testData.messages[model].update.message.payload.id} "${model}" not found`)
    })
  })
})
