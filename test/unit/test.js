/**
 * Mocha tests of the UBahn ES Processor.
 */

const _ = require('lodash')
const should = require('should')
const config = require('config')
const stringcase = require('stringcase')
const testData = require('../common/testData')
const testHelper = require('../common/testHelper')
const sinon = require('sinon')
const logger = require('../../src/common/logger')
const helper = require('../../src/common/helper')
const constants = require('../../src/common/constants')
const services = {
  JobProcessorService: require('../../src/services/JobProcessorService'),
  JobCandidateProcessorService: require('../../src/services/JobCandidateProcessorService'),
  ResourceBookingProcessorService: require('../../src/services/ResourceBookingProcessorService')
}

// random transaction id here
const transactionId = '2023692c-a9d3-4250-86c4-b83f381a5d03'

describe('General Logic Tests', () => {
  let sandbox

  before(() => {
    // mock helper methods
    sandbox = sinon.createSandbox()
    sandbox.stub(helper, 'postMessageViaWebhook').callsFake((webhook, message) => {
      logger.debug({ component: 'helper', context: 'postMessageToZapier (stub)', message: `message: ${JSON.stringify({ webhook, message })}` })
    })
    sandbox.stub(helper, 'getM2MToken').callsFake(() => {
      const token = 'dummy-token'
      logger.debug({ component: 'helper', context: 'getM2MToken (stub)', message: token })
      return token
    })
  })

  beforeEach(() => {
    // clear es storage
    testData.esStorage.content = {}
  })

  after(() => {
    // clear es storage
    testData.esStorage.content = {}

    sandbox.restore()
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
        testData.messages[model].create.message.payload
      )
    })

    it('processUpdate - success', async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[model].create.message.payload.id,
        body: testData.messages[model].create.message.payload,
        refresh: 'true'
      })
      await services[`${model}ProcessorService`].processUpdate(testData.messages[model].update.message, transactionId)
      should.deepEqual(
        testData.esStorage.content[testData.messages[model].create.message.payload.id],
        testData.messages[model].update.message.payload
      )
    })

    it('processDelete - success', async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[model].create.message.payload.id,
        body: testData.messages[model].create.message.payload,
        refresh: 'true'
      })
      await services[`${model}ProcessorService`].processDelete(testData.messages[model].delete.message, transactionId)
      should.not.exist(testData.esStorage.content[testData.messages[model].create.message.payload.id])
    })

    it(`Failure - processCreate - ${modelInSpaceCase} already exists`, async () => {
      await testHelper.esClient.create({
        index,
        id: testData.messages[model].create.message.payload.id,
        body: testData.messages[model].create.message.payload,
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

describe('Zapier Logic Tests', () => {
  let sandbox

  beforeEach(() => {
    // clear es storage
    testData.esStorage.content = {}

    // mock helper methods
    sandbox = sinon.createSandbox()
    sandbox.stub(helper, 'postMessageViaWebhook').callsFake((webhook, message) => {
      logger.debug({ component: 'helper', context: 'postMessageToZapier (stub)', message: `message: ${JSON.stringify({ webhook, message })}` })
    })
    sandbox.stub(helper, 'getM2MToken').callsFake(() => {
      const token = 'dummy-token'
      logger.debug({ component: 'helper', context: 'getM2MToken (stub)', message: token })
      return token
    })
  })

  afterEach(() => {
    // clear es storage
    testData.esStorage.content = {}

    // reset mocked methods
    sandbox.restore()
  })

  it('should have Zapier switched ON during testing Zapier logic', () => {
    // to enable Job Candidates Zapier logic
    should.equal(config.zapier.ZAPIER_JOB_CANDIDATE_SWITCH, constants.Zapier.Switch.ON)
    // to enable Jobs Zapier logic
    should.equal(config.zapier.ZAPIER_SWITCH, constants.Zapier.Switch.ON)
  })

  describe('Job Candidate Update', () => {
    it('should post to Zapier if status is changed to "rejected"', async () => {
      const previousData = _.assign({}, testData.messages.JobCandidate.create.message.payload, { status: 'open', externalId: '123' })
      const updateMessage = _.assign({}, testData.messages.JobCandidate.update.message, {
        payload: _.assign({}, testData.messages.JobCandidate.update.message.payload, { status: 'rejected', externalId: '123' })
      })

      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB,
        id: previousData.id,
        body: previousData,
        refresh: 'true'
      })
      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB_CANDIDATE,
        id: testData.messages.Job.create.message.payload.id,
        body: testData.messages.Job.create.message.payload,
        refresh: 'true'
      })
      await services[`JobCandidateProcessorService`].processUpdate(updateMessage, transactionId)

      helper.postMessageViaWebhook.callCount.should.equal(1)
    })

    it('should post to Zapier if status is changed to "shortlist"', async () => {
      const previousData = _.assign({}, testData.messages.JobCandidate.create.message.payload, { status: 'open', externalId: '123' })
      const updateMessage = _.assign({}, testData.messages.JobCandidate.update.message, {
        payload: _.assign({}, testData.messages.JobCandidate.update.message.payload, { status: 'shortlist', externalId: '123' })
      })

      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB,
        id: previousData.id,
        body: previousData,
        refresh: 'true'
      })
      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB_CANDIDATE,
        id: testData.messages.Job.create.message.payload.id,
        body: testData.messages.Job.create.message.payload,
        refresh: 'true'
      })
      await services[`JobCandidateProcessorService`].processUpdate(updateMessage, transactionId)

      helper.postMessageViaWebhook.callCount.should.equal(1)
    })

    it('should not post to Zapier if status was already "rejected"', async () => {
      const previousData = _.assign({}, testData.messages.JobCandidate.create.message.payload, { status: 'rejected', externalId: '123' })
      const updateMessage = _.assign({}, testData.messages.JobCandidate.update.message, {
        payload: _.assign({}, testData.messages.JobCandidate.update.message.payload, { status: 'rejected', externalId: '123' })
      })

      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB,
        id: previousData.id,
        body: previousData,
        refresh: 'true'
      })
      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB_CANDIDATE,
        id: testData.messages.Job.create.message.payload.id,
        body: testData.messages.Job.create.message.payload,
        refresh: 'true'
      })
      await services[`JobCandidateProcessorService`].processUpdate(updateMessage, transactionId)

      helper.postMessageViaWebhook.callCount.should.equal(0)
    })

    it('should not post to Zapier if status was already "shortlist"', async () => {
      const previousData = _.assign({}, testData.messages.JobCandidate.create.message.payload, { status: 'shortlist', externalId: '123' })
      const updateMessage = _.assign({}, testData.messages.JobCandidate.update.message, {
        payload: _.assign({}, testData.messages.JobCandidate.update.message.payload, { status: 'shortlist', externalId: '123' })
      })

      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB,
        id: previousData.id,
        body: previousData,
        refresh: 'true'
      })
      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB_CANDIDATE,
        id: testData.messages.Job.create.message.payload.id,
        body: testData.messages.Job.create.message.payload,
        refresh: 'true'
      })
      await services[`JobCandidateProcessorService`].processUpdate(updateMessage, transactionId)

      helper.postMessageViaWebhook.callCount.should.equal(0)
    })

    it('should not post to Zapier if status is changed to "interview" (not "rejected" or "shortlist")', async () => {
      const previousData = _.assign({}, testData.messages.JobCandidate.create.message.payload, { status: 'open', externalId: '123' })
      const updateMessage = _.assign({}, testData.messages.JobCandidate.update.message, {
        payload: _.assign({}, testData.messages.JobCandidate.update.message.payload, { status: 'interview', externalId: '123' })
      })

      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB,
        id: previousData.id,
        body: previousData,
        refresh: 'true'
      })
      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB_CANDIDATE,
        id: testData.messages.Job.create.message.payload.id,
        body: testData.messages.Job.create.message.payload,
        refresh: 'true'
      })
      await services[`JobCandidateProcessorService`].processUpdate(updateMessage, transactionId)

      helper.postMessageViaWebhook.callCount.should.equal(0)
    })

    it('should not post to Zapier if status is changed to "topcoder-rejected" (not "rejected" or "shortlist")', async () => {
      const previousData = _.assign({}, testData.messages.JobCandidate.create.message.payload, { status: 'open', externalId: '123' })
      const updateMessage = _.assign({}, testData.messages.JobCandidate.update.message, {
        payload: _.assign({}, testData.messages.JobCandidate.update.message.payload, { status: 'topcoder-rejected', externalId: '123' })
      })

      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB,
        id: previousData.id,
        body: previousData,
        refresh: 'true'
      })
      await testHelper.esClient.create({
        index: config.esConfig.ES_INDEX_JOB_CANDIDATE,
        id: testData.messages.Job.create.message.payload.id,
        body: testData.messages.Job.create.message.payload,
        refresh: 'true'
      })
      await services[`JobCandidateProcessorService`].processUpdate(updateMessage, transactionId)

      helper.postMessageViaWebhook.callCount.should.equal(0)
    })
  })
})
