const assert = require('assert')
const express = require('express')
const {
  get, first, isNil, every, isNumber, isEmpty
} = require('lodash')
const createError = require('http-errors')
const { promisify } = require('util')
const User = require('../../../models/user')
const { asyncHandler } = require('../../util/express')
const {
  convertResourcePayloadToNewResourceProperties
} = require('../../logic/resource/converters')
const { saveContent } = require('../../logic/resource/storage')
const {
  startPipelineProcess,
  startLegacyPipelineProcess,
  getPipelineProcessLogs
} = require('../../pipelines/execute')

const Resource = require('../../../models/resource')

const createResource = promisify(Resource.create.bind(Resource))
const findByUuidOrSlug = promisify(Resource.findByUuidOrSlug.bind(Resource))
const updateTopicModellingScores = promisify(Resource.updateTopicModellingScores.bind(Resource))

const router = express.Router()

/**
 * Return resources curated by current user.
 */
router.get('/curated', asyncHandler(async (req, res) => {
  const resources = await User.getCuratedResources(req.user)
  res.json({ resources })
}))

/**
 * Add new resource or update existing one.
 * This is similar to importing a single line of CSV as in
 * `node scripts/manage.js --task=import.fromCSV --source=file.csv`
 */
router.post('/', asyncHandler(async (req, res) => {
  const properties = convertResourcePayloadToNewResourceProperties(req.body)

  const content = get(req.body, 'content', {})
  const contentLanguageCodes = Object.keys(content)
  await Promise.all(contentLanguageCodes.map(async languageCode => {
    const contentValue = content[languageCode]
    const url = properties[`url_${languageCode}`]
    return saveContent(url, contentValue, properties.full_mimetype)
  }))

  properties.user = req.user

  const resource = await createResource(properties)

  res.json({ resource })
}))

router.put('/:slug_or_id/topic-modelling-scores', asyncHandler(async (req, res) => {
  const { slug_or_id: slugOrId } = req.params
  const { scores } = req.body

  if (!isEmpty(scores)) assert(every(scores.map(isNumber)), 'Some of the scores are not a number')

  const results = (await findByUuidOrSlug(slugOrId)).filter(r => !isNil(r))
  assert(results.length < 2, `Found ${results.length} candidates.`)
  const resource = first(results)

  if (isEmpty(resource)) throw createError(404, 'No such resource found')

  const updatedResource = await updateTopicModellingScores(resource.uuid, scores)

  res.json({
    resource: updatedResource
  })
}))

/**
 * Launch discovery process on new "not yet discovered" resources.
 */
router.post('/discovery-processes', asyncHandler(async (req, res) => {
  const { legacy = false } = req.query
  const parameters = req.body
  const legacyTask = 'resource.discoverMany'
  const task = parameters.resourceUuid
    ? 'resourceEntitiesDiscovery'
    : 'undiscoveredResourcesEntitiesDiscovery'
  const refId = legacy
    ? await startLegacyPipelineProcess(legacyTask, parameters)
    : await startPipelineProcess(task, parameters)
  res.json({ refId, isLegacy: !!legacy })
}))

/**
 * Get `stdout` and `stderr` content of a particular discovery process.
 */
router.get('/discovery-processes/:id', asyncHandler(async (req, res) => {
  const logs = await getPipelineProcessLogs(req.params.id)
  if (!logs) throw createError(404, 'No such discovery process ID found')
  res.json(logs)
}))

module.exports = router
