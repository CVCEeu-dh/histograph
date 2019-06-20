const express = require('express')
const { get } = require('lodash')
const { promisify } = require('util')
const User = require('../../../models/user')
const { asyncHandler } = require('../../util/express')
const {
  convertResourcePayloadToNewResourceProperties
} = require('../../logic/resource/converters')
const { saveContent } = require('../../logic/resource/storage')
const Resource = require('../../../models/resource')

const createResource = promisify(Resource.create.bind(Resource))

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

module.exports = router
