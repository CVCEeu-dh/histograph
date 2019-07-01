const assert = require('assert')
const { promisify } = require('util')
const { get, isString } = require('lodash')
const axios = require('axios')
const decypher = require('decypher')
const {
  first, uniq, flatten,
  zip, toString, isFunction,
  toPairs, groupBy
} = require('lodash')

const { getLogger } = require('../util/log')
const settings = require('../../settings')
const { getQueryMethod } = require('../util/neo4j')
const { getTextContent } = require('../logic/resource/storage')
const Resource = require('../../models/resource')

const {
  getEntityFilter,
  alwaysTrueEntityFilter
} = require('../logic/c2dhnerd/entityFilters')

const {
  c2dhNerdToHistographEntityPropertiesList,
  buildAnnotationPropertiesListFromEntityContextsPairs
} = require('../logic/c2dhnerd/converters')

const createRelatedEntity = promisify(Resource.createRelatedEntity)
const createRelatedVersion = promisify(Resource.createRelatedVersion)

const log = getLogger()

const resourceQueries = decypher(`${__dirname}/../../queries/resource.cyp`)

async function getNedResults(endpoint, text, options = {}) {
  const {
    method,
    url,
    // languageCode
  } = options
  assert(isString(method), '"method" must be provided')
  const result = await axios.post(`${endpoint}/ned`, {
    method,
    text,
    url
  }).catch(error => {
    const code = get(error, 'response.status', '')
    const message = get(error, 'response.data.message', error.message)
    const stack = get(error, 'response.data.stack', error.message)
    throw new Error(`Got error (${code}) while trying to get NED results from C2dhNed: ${message} | ${stack}`)
  })

  if (result.status !== 200) {
    throw new Error(`Got erroneous response from NERD (${result.status}): ${JSON.stringify(result.data)}`)
  }
  log.info(`NED "${method}" took ${get(result, 'data.time_elapsed_seconds', 'NA')} sec to process ${text.length} characters`)

  return result.data
}

async function getResourceByUuid(uuid) {
  const queryMethod = getQueryMethod()
  const result = await queryMethod(resourceQueries.get_resource_by_uuid, { uuid })
  return first(result)
}

/**
 * @param {Resource} - DB resource object
 * @param {string} - ISO 2 letter language code
 * @return {string} - resource content for this language loaded from storage
 */
async function getContentForLanguage(resource, languageCode) {
  const fileName = get(resource, `url_${languageCode}`)
  return getTextContent(fileName, get(resource, 'mimetype'))
}

/**
 * Merge text elements into a single text ready to be sent
 * to NER/NED.
 * @param  {...object} languageAndTextItemsList - a list of:
 * `[['en', 'word A'], ['fr', 'mot A']]` where the first element
 * of sublist is language code and the second one is associated text.
 *
 * @return {array} - an array of `['en', 'text.....']` where the first
 * element is language code and the second element is text ready to be
 * sent to NER/NED
 */
function mergeAsNedPayload(...languageAndTextItemsList) {
  const languageCodes = uniq(flatten(languageAndTextItemsList
    .map(latItems => latItems.map(([lang]) => lang))))
  return languageCodes.map(lc => {
    const texts = flatten(languageAndTextItemsList
      .map(
        languageAndTextItems => languageAndTextItems
          .filter(([lang]) => lang === lc)
          .map(([, text]) => toString(text).trim())
      ))
    return [lc, texts.join('. ')]
  })
}

function getValueOfFieldWithLanguageSuffix(resource, field, languageCode) {
  return get(resource, `${field}_${languageCode}`)
}

async function execute(options = {}) {
  log.info('Executing entities discovery with', options)

  // Get C2DH Nerd endpoint
  const c2dhNerdEndpoint = get(settings, 'c2dhnerd.endpoint')
  assert(isString(c2dhNerdEndpoint), 'No C2DH Nerd endpoint found in settings')

  const nedMethod = get(options, 'nedMethod')
  assert(isString(nedMethod), '"nedMethod" option required')
  log.info(`Using NER/NED method: "${nedMethod}"`)

  const entityFilterName = get(options, 'entityFilter')
  const entityFilter = entityFilterName === undefined
    ? alwaysTrueEntityFilter
    : getEntityFilter(entityFilterName)

  if (entityFilterName !== undefined) {
    log.info(`Using entity filter "${entityFilterName}"`)
  }

  const externalEntitiesUrl = get(options, 'externalEntitiesUrl')
  if (externalEntitiesUrl !== undefined) {
    log.info(`Using external entities from "${externalEntitiesUrl}"`)
  }

  assert(isFunction(entityFilter), `Could not find entity filter "${entityFilterName}"`)

  // Load resource
  const { resourceUuid } = options
  const resource = await getResourceByUuid(resourceUuid)
  if (!resource) {
    throw new Error(`No resource found with UUID "${resourceUuid}"`)
  }
  log.info(`Loaded resource "${resourceUuid}": ${resource.name}`)

  // Get textual content for `title`, `content` and `caption`
  const languageAndContent = await Promise
    .all(resource.languages.map(async lc => [lc, await getContentForLanguage(resource, lc)]))
  const languageAndTitle = resource.languages
    .map(lc => [lc, getValueOfFieldWithLanguageSuffix(resource, 'title', lc)])
  const languageAndCaption = resource.languages
    .map(lc => [lc, getValueOfFieldWithLanguageSuffix(resource, 'caption', lc)])

  // Prepare payload for NER/NED
  // A list of ['<language_code>', '<text_content>'] pairs.
  // Text content is a concatenated 'title', 'caption' and 'content'.
  const nedPayloadByLanguage = mergeAsNedPayload(
    languageAndTitle,
    languageAndCaption,
    languageAndContent,
  )

  // Perform NER/NED
  const results = await Promise.all(nedPayloadByLanguage
    .map(async ([languageCode, content]) => getNedResults(
      c2dhNerdEndpoint, content, { 
        languageCode,
        method: nedMethod,
        url: externalEntitiesUrl
      }
    )))

  zip(
    nedPayloadByLanguage.map(([language]) => language),
    results.map(({ entities }) => entities)
  ).forEach(([language, entities]) => {
    log.info(`Received ${entities.length} entities for language "${language}" from NER/NED`)
  })

  // Join entities by language and perform entity filtering
  // using `entityFilter`.
  const languageAndEntityPairs = flatten(zip(
    nedPayloadByLanguage.map(([language]) => language),
    results.map(({ entities }) => entities.filter(entityFilter))
  ).map(([lang, entities]) => entities.map(e => [lang, e])))

  toPairs(groupBy(languageAndEntityPairs, 0)).forEach(([language, entities]) => {
    log.info(`${entities.length} entities for language "${language}" after filtering`)
  })

  // create entities properties to be inserted into the DB
  const histographEntityPropertiesList = c2dhNerdToHistographEntityPropertiesList(
    languageAndEntityPairs
  ).map(e => {
    e.services = [nedMethod]
    return e
  })

  log.info(`Saving ${histographEntityPropertiesList.length} histograph entities`)

  // create entities in the DB
  const dbEntities = await Promise.all(
    histographEntityPropertiesList.map(e => createRelatedEntity(resource, e))
  )
  log.info(`Saved ${dbEntities.length} histograph entities`)

  // build annotations for entities
  const annotationPropertiesList = buildAnnotationPropertiesListFromEntityContextsPairs(
    zip(dbEntities, histographEntityPropertiesList.map(({ contexts }) => contexts)),
    nedMethod
  )

  log.info(`Saving ${annotationPropertiesList.length} resource annotations`)

  // save annotations in the DB
  const dbAnnotations = await Promise.all(
    annotationPropertiesList.map(async a => createRelatedVersion(resource, a))
  )

  log.info(`Saved ${dbAnnotations.length} resource annotations`)

  log.info(`Marking resource "${resourceUuid}" as discovered`)

  await getQueryMethod()(resourceQueries.mark_discovered, { uuid: resourceUuid })

  return `Resource "${resourceUuid}" successfully discovered`
}

module.exports = { execute }
