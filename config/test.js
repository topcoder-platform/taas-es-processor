/**
 * The default configuration file.
 */

module.exports = {
  zapier: {
    ZAPIER_SWITCH: process.env.ZAPIER_SWITCH || 'ON',
    ZAPIER_JOB_CANDIDATE_SWITCH: process.env.ZAPIER_JOB_CANDIDATE_SWITCH || 'ON'
  }
}
