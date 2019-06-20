const crypto = require('crypto')

/**
 * @return a random 24 characters long string to be used
 * as an API Key.
 */
function generateApiKey() {
  return crypto.randomBytes(24).toString('hex')
}


module.exports = {
  generateApiKey
}
