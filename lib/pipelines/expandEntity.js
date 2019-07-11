const assert = require('assert')
const {
  get, isString, first, assignIn
} = require('lodash')
const decypher = require('decypher')
const axios = require('axios')

const parser = require('../../parser')
const helpers = require('../../helpers')
const { getLogger } = require('../util/log')
const settings = require('../../settings')
const { getQueryMethod } = require('../util/neo4j')
const {
  c2dhNerLanguageAndEntityPairsToHistographEntityProperties
} = require('../logic/c2dhnerd/converters')

const log = getLogger()

const entityQueries = decypher(`${__dirname}/../../queries/entity.cyp`)

async function getEntityByUuid(uuid) {
  const queryMethod = getQueryMethod()
  const result = await queryMethod(entityQueries.get_entity, { id: uuid })
  return first(result)
}

async function updateEntityProperties(uuid, properties) {
  const now = helpers.now()

  const params = assignIn({ exec_date: now.date, exec_time: now.time }, properties, { uuid })
  const query = parser.agentBrown(entityQueries.update_entity_properties, params)
  const queryMethod = getQueryMethod()
  return queryMethod(query, params)
}

async function getExpandedNedResource(endpoint, options = {}) {
  const {
    model,
    id,
    label
  } = options
  const result = await axios.post(`${endpoint}/entities/expand`, {
    model,
    id,
    label
  }).catch(error => {
    const code = get(error, 'response.status', '')
    const message = get(error, 'response.data.message', error.message)
    const stack = get(error, 'response.data.stack', error.message)
    throw new Error(`Got error (${code}) while trying to get NED results from C2dhNed: ${message} | ${stack}`)
  })

  if (result.status !== 200) {
    throw new Error(`Got erroneous response from NERD (${result.status}): ${JSON.stringify(result.data)}`)
  }

  return result.data.entity
}

async function execute(options = {}) {
  log.info('Executing entities discovery with', options)

  // Get C2DH Nerd endpoint
  const c2dhNerdEndpoint = get(settings, 'c2dhnerd.endpoint')
  assert(isString(c2dhNerdEndpoint), 'No C2DH Nerd endpoint found in settings')

  // Load resource
  const { entityUuid } = options
  const entity = await getEntityByUuid(entityUuid)
  const resource = await getExpandedNedResource(c2dhNerdEndpoint, {
    model: entity.props.entity__ned_model,
    id: entity.props.entity__ned_id,
    label: entity.props.name
  })

  if (!resource) return `No expanded data found for entity ${entityUuid}`

  const properties = c2dhNerLanguageAndEntityPairsToHistographEntityProperties([
    ['en', { matched_resource: resource }]
  ])

  // properties we do not want to update (yet)
  delete properties.languages
  delete properties.frequency
  delete properties.contexts
  delete properties.name
  delete properties.slug
  delete properties.type

  await updateEntityProperties(entityUuid, properties)
  return entityUuid
}

module.exports = { execute }
