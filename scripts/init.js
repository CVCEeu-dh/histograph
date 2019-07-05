/* eslint-disable no-console */
const createIndexes = require('./tasks/setup')[0]

createIndexes({}, err => {
  if (err) {
    console.error(err.stack)
    return process.exit(1)
  }
  console.log('Done')
  return process.exit(0)
})
