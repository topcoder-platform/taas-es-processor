/*
 * Setting up Mock for all tests
 */

require('../../src/bootstrap')

const _ = require('lodash')
const nock = require('nock')
const prepare = require('mocha-prepare')
const testData = require('../common/testData')

// low-budget function to extract document id from uri
const idFromUri = (uri) => _.last(uri.split('/')).split('?')[0]

prepare(function (done) {
  // called before loading of test cases
  nock(/.com|localhost/)
    .persist()
    .put(uri => uri.includes('_create'))
    .query(true)
    .reply((uri, body) => {
      const id = idFromUri(uri)
      if (testData.esStorage.content[id]) {
        return [409]
      } else {
        testData.esStorage.content[id] = body
        return [200]
      }
    })
    .post(uri => uri.includes('_update'))
    .query(true)
    .reply((uri, body) => {
      const id = idFromUri(uri)
      if (testData.esStorage.content[id]) {
        testData.esStorage.content[id] = body.doc
        return [200]
      } else {
        return [404]
      }
    })
    .delete(() => true)
    .query(true)
    .reply(uri => {
      const id = idFromUri(uri)
      if (testData.esStorage.content[id]) {
        _.unset(testData.esStorage.content, id)
        return [204]
      } else {
        return [404]
      }
    })
    .get(uri => uri.includes('_source'))
    .query(true)
    .reply(uri => {
      const id = idFromUri(uri)
      if (testData.esStorage.content[id]) {
        return [200, testData.esStorage.content[id]]
      } else {
        return [404]
      }
    })
  done()
}, function (done) {
  nock.cleanAll()
  done()
})
