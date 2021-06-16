/**
 * Contains generic helper methods for test
 */
const Kafka = require('no-kafka')
const _ = require('lodash')
const config = require('config')
const helper = require('../../src/common/helper')

let producer
const esClient = helper.getESClient()

/**
  * Send message
  * @param testMessage the test message
  * @param topic the topic name; optional
  */
async function sendMessage (testMessage, topic) {
  if (!producer) {
    producer = new Kafka.Producer(helper.getKafkaOptions())
    await producer.init()
  }
  await producer.send({
    topic: topic || testMessage.topic,
    message: {
      value: (typeof testMessage) === 'string' ? testMessage : JSON.stringify(testMessage)
    }
  })
}

/**
 * Delete all documents in ES.
 *
 * @returns {undefined}
 */
async function clearES () {
  for (const index of Object.values(_.pick(config.esConfig, ['ES_INDEX_JOB', 'ES_INDEX_JOB_CANDIDATE', 'ES_INDEX_RESOURCE_BOOKING']))) {
    await esClient.deleteByQuery({
      index,
      body: {
        query: {
          match_all: {}
        }
      },
      refresh: true
    })
  }
}

module.exports = {
  sendMessage,
  clearES,
  esClient
}
