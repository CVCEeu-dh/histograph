const { promisify } = require('util')
const seraph = require('seraph')
const { slice } = require('lodash')

const settings = require('../../settings')
const { agentBrown: prepareQuery } = require('../../parser')

function createNeo4jQueryMethod() {
  const neo4jClient = seraph(settings.neo4j.host)
  return promisify((...args) => {
    const [query, params] = args
    const preparedQuery = prepareQuery(query, params)
    const updatedArgs = [preparedQuery, params].concat(slice(args, 2))
    return neo4jClient.query(...updatedArgs)
  })
}

module.exports = {
  getQueryMethod: createNeo4jQueryMethod
}
