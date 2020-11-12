/*
 * Data for tests.
 */
const messages = {
  Job: {
    create: { topic: 'taas.job.create', message: require('../messages/taas.job.create.event.json') },
    update: { topic: 'taas.job.update', message: require('../messages/taas.job.update.event.json') },
    delete: { topic: 'taas.job.delete', message: require('../messages/taas.job.delete.event.json') }
  },
  JobCandidate: {
    create: { topic: 'taas.jobcandidate.create', message: require('../messages/taas.jobcandidate.create.event.json') },
    update: { topic: 'taas.jobcandidate.update', message: require('../messages/taas.jobcandidate.update.event.json') },
    delete: { topic: 'taas.jobcandidate.delete', message: require('../messages/taas.jobcandidate.delete.event.json') }
  },
  ResourceBooking: {
    create: { topic: 'taas.resourcebooking.create', message: require('../messages/taas.resourcebooking.create.event.json') },
    update: { topic: 'taas.resourcebooking.update', message: require('../messages/taas.resourcebooking.update.event.json') },
    delete: { topic: 'taas.resourcebooking.delete', message: require('../messages/taas.resourcebooking.delete.event.json') }
  },
  messageInvalid: '{ "topic": "taas.job.create", }'
}

// used in unit tests to mock es storage
const esStorage = { content: {} }

module.exports = {
  messages,
  esStorage
}
