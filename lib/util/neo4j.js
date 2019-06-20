const { promisify } = require('util')
const seraph = require('seraph')

const settings = require('../../settings')

function createNeo4jQueryMethod() {
  const neo4jClient = seraph(settings.neo4j.host)
  return promisify(neo4jClient.query.bind(neo4jClient))
}

module.exports = {
  getQueryMethod: createNeo4jQueryMethod
}
