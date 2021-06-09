/**
 * The default configuration file.
 */

module.exports = {
  zapier: {
    ZAPIER_SWITCH: process.env.ZAPIER_SWITCH || 'ON',
    ZAPIER_JOB_CANDIDATE_SWITCH: process.env.ZAPIER_JOB_CANDIDATE_SWITCH || 'ON'
  },
  // don't retry actions during tests because tests for now don't expect it and should be updated first
  MAX_RETRY: 0,
}
