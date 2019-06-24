const minimist = require('minimist')
const { getLogger } = require('./lib/util/log')

const log = getLogger(true)

async function main() {
  const args = minimist(process.argv.slice(2))
  const { name, parameters } = args

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const pipeline = require(`./lib/pipelines/${name}`)
  const parametersObject = JSON.parse(parameters || '{}')
  return pipeline.execute(parametersObject)
}

if (require.main === module) {
  main()
    .then(result => {
      log.info('Done:', result)
      process.exit(0)
    })
    .catch(err => {
      log.error('Unexpected error:', err.stack)
      process.exit(1)
    })
}
