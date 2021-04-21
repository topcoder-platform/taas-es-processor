/**
 * The application entry point
 */

require('./bootstrap')
const config = require('config')
const Kafka = require('no-kafka')
const _ = require('lodash')
const healthcheck = require('topcoder-healthcheck-dropin')
const logger = require('./common/logger')
const helper = require('./common/helper')
const JobProcessorService = require('./services/JobProcessorService')
const JobCandidateProcessorService = require('./services/JobCandidateProcessorService')
const ResourceBookingProcessorService = require('./services/ResourceBookingProcessorService')
const WorkPeriodProcessorService = require('./services/WorkPeriodProcessorService')
const InterviewProcessorService = require('./services/InterviewProcessorService')
const Mutex = require('async-mutex').Mutex
const events = require('events')

const eventEmitter = new events.EventEmitter()

// healthcheck listening port
process.env.PORT = config.PORT

const localLogger = {
  info: (message) => logger.info({ component: 'app', message }),
  debug: (message) => logger.debug({ component: 'app', message }),
  error: (message) => logger.error({ component: 'app', message })
}

const topicServiceMapping = {
  // job
  [config.topics.TAAS_JOB_CREATE_TOPIC]: JobProcessorService.processCreate,
  [config.topics.TAAS_JOB_UPDATE_TOPIC]: JobProcessorService.processUpdate,
  [config.topics.TAAS_JOB_DELETE_TOPIC]: JobProcessorService.processDelete,
  // job candidate
  [config.topics.TAAS_JOB_CANDIDATE_CREATE_TOPIC]: JobCandidateProcessorService.processCreate,
  [config.topics.TAAS_JOB_CANDIDATE_UPDATE_TOPIC]: JobCandidateProcessorService.processUpdate,
  [config.topics.TAAS_JOB_CANDIDATE_DELETE_TOPIC]: JobCandidateProcessorService.processDelete,
  // resource booking
  [config.topics.TAAS_RESOURCE_BOOKING_CREATE_TOPIC]: ResourceBookingProcessorService.processCreate,
  [config.topics.TAAS_RESOURCE_BOOKING_UPDATE_TOPIC]: ResourceBookingProcessorService.processUpdate,
  [config.topics.TAAS_RESOURCE_BOOKING_DELETE_TOPIC]: ResourceBookingProcessorService.processDelete,
  // work period
  [config.topics.TAAS_WORK_PERIOD_CREATE_TOPIC]: WorkPeriodProcessorService.processCreate,
  [config.topics.TAAS_WORK_PERIOD_UPDATE_TOPIC]: WorkPeriodProcessorService.processUpdate,
  [config.topics.TAAS_WORK_PERIOD_DELETE_TOPIC]: WorkPeriodProcessorService.processDelete,
  // interview
  [config.topics.TAAS_INTERVIEW_REQUEST_TOPIC]: InterviewProcessorService.processRequestInterview,
  [config.topics.TAAS_INTERVIEW_UPDATE_TOPIC]: InterviewProcessorService.processUpdateInterview
}

// Start kafka consumer
localLogger.info('Starting kafka consumer')
// create consumer
const consumer = new Kafka.GroupConsumer(helper.getKafkaOptions())

let count = 0
const mutex = new Mutex()

async function getLatestCount () {
  const release = await mutex.acquire()

  try {
    count = count + 1

    return count
  } finally {
    release()
  }
}

/*
 * Data handler linked with Kafka consumer
 * Whenever a new message is received by Kafka consumer,
 * this function will be invoked
 */
const dataHandler = (messageSet, topic, partition) => Promise.each(messageSet, async (m) => {
  const message = m.message.value.toString('utf8')
  localLogger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${
    m.offset}; Message: ${message}.`)
  let messageJSON
  const messageCount = await getLatestCount()

  localLogger.debug(`Current message count: ${messageCount}`)
  try {
    messageJSON = JSON.parse(message)
  } catch (e) {
    localLogger.error(`Invalid message JSON: ${e.message}`)
    localLogger.debug(`Commiting offset after processing message with count ${messageCount}`)

    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }

  if (messageJSON.topic !== topic) {
    localLogger.error(`The message topic ${messageJSON.topic} doesn't match the Kafka topic ${topic}.`)

    localLogger.debug(`Commiting offset after processing message with count ${messageCount}`)

    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }
  const transactionId = _.uniqueId('transaction_')
  try {
    if (!topicServiceMapping[topic]) {
      throw new Error(`Unknown topic: ${topic}`) // normally it never reaches this line
    }
    await topicServiceMapping[topic](messageJSON, transactionId)

    localLogger.debug(`Successfully processed message with count ${messageCount}`)
  } catch (err) {
    logger.logFullError(err, { component: 'app' })
  } finally {
    helper.checkEsMutexRelease(transactionId)
    localLogger.debug(`Commiting offset after processing message with count ${messageCount}`)

    // Commit offset regardless of error
    await consumer.commitOffset({ topic, partition, offset: m.offset })
  }
})

// check if there is kafka connection alive
const check = () => {
  if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach(conn => {
    localLogger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

const topics = Object.values(config.topics)

/**
 * Init consumer.
 *
 * @returns {undefined}
 */
async function initConsumer () {
  await consumer
    .init([{
      subscriptions: topics,
      handler: async (messageSet, topic, partition) => {
        eventEmitter.emit('start_handling_message')
        await dataHandler(messageSet, topic, partition)
        eventEmitter.emit('end_handling_message')
      }
    }])
    .then(() => {
      localLogger.info('Initialized.......')
      healthcheck.init([check])
      localLogger.info(topics)
      localLogger.info('Kick Start.......')
    }).catch(err => {
      logger.logFullError(err, { component: 'app' })
    })
}

if (!module.parent) {
  initConsumer()
}

module.exports = {
  initConsumer,
  eventEmitter
}
