const decypher = require('decypher')
const { assignIn, cloneDeep } = require('lodash')

const { getLogger } = require('../util/log')
const { execute: executeResourceEntitiesDiscovery } = require('./resourceEntitiesDiscovery')
const { getQueryMethod } = require('../util/neo4j')

const log = getLogger()

const resourceQueries = decypher(`${__dirname}/../../queries/resource.cyp`)

async function execute(options = {}) {
  const queryMethod = getQueryMethod()
  const results = await queryMethod(resourceQueries.get_uuids_of_not_discovered_resources, {})
  const uuids = results.map(r => r['r.uuid'])

  log.info(`${uuids.length} undiscovered resources found`)

  // eslint-disable-next-line no-restricted-syntax
  for (const resourceUuid of uuids) {
    const opts = assignIn(cloneDeep(options), { resourceUuid })
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await executeResourceEntitiesDiscovery(opts)
      log.info(result)
    } catch (e) {
      log.error(`An error occurred while discovering resource "${resourceUuid}":`, e.stack)
    }
  }

  return `All ${uuids.length} resources have been discovered`
}

module.exports = { execute }
