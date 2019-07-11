const assert = require('assert')
const moment = require('moment')

function toUnixSeconds(timeString) {
  const time = moment.utc(timeString)
  assert(time.isValid(), `Invalid time string: "${timeString}"`)

  return Math.floor(time.valueOf() / 1000)
}

module.exports = {
  toUnixSeconds
}
