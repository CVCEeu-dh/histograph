const {
  get, includes, isString, difference,
  uniq, flatten
} = require('lodash')
const assert = require('assert')
const moment = require('moment')
const crypto = require('crypto')

const settings = require('../../../settings')

const AvailableResourceTypes = get(settings, 'types.resources')
const SupportedLanguages = [
  'en', 'es', 'it', 'fr', 'de', 'und'
]

/*
  There are traces of other types in the code but in reality
  only two are supported at the moment: 'image' and 'text'.
*/
const SupportedMimeTypePrefixes = ['image', 'text']
const DefaultMimeType = 'text/plain'

function getFieldLanguages(obj, field) {
  const fieldValue = get(obj, field, {})
  const fieldLanguages = Object.keys(fieldValue)
  const unknownLanguages = difference(fieldLanguages, SupportedLanguages)
  assert(unknownLanguages.length === 0, `Not supported languages in "${field}": ${unknownLanguages}`)
  assert(fieldLanguages.length > 0, `At least one language must be provided in "${field}"`)

  return fieldLanguages
}

function isText(mimeType) {
  const [mimeTypePrefix] = mimeType.split('/')
  return mimeTypePrefix === 'text'
}

function generateContentUrl(content, mimeType) {
  const [mimeTypePrefix, mimeTypeSuffix] = mimeType.split('/')
  const fingerprint = crypto.createHash('md5').update(content).digest('hex')
  const extension = mimeTypePrefix === 'text'
    ? 'txt'
    : mimeTypeSuffix

  return `${fingerprint}.${extension}`
}

/**
 * Validate and normalize resource properties.
 *
 * @param {object} payload object describing new resource.
 * Used in the API but can be used anywhere.
 * @return {object} object ready to be added to the database
 * using `Resource.create`.
 */
function convertResourcePayloadToNewResourceProperties(payload) {
  const resourceType = get(payload, 'type', '')
  assert(includes(AvailableResourceTypes, resourceType), `Unknown resource type: "${resourceType}". Should be one of: ${AvailableResourceTypes.join(', ')}`)

  const mimeType = get(payload, 'mimetype', DefaultMimeType)
  const mimeTypePrefix = mimeType.split('/')[0]
  assert(includes(SupportedMimeTypePrefixes, mimeTypePrefix), `Mimetype not supported: ${mimeType}. Should start with one of: ${SupportedMimeTypePrefixes.join(', ')}`)

  const startDate = get(payload, 'start_date', '')
  assert(moment(startDate).isValid(), `Invalid "start_date": ${startDate}`)

  const endDate = get(payload, 'end_date', '')
  assert(moment(endDate).isValid(), `Invalid "end_date": ${endDate}`)

  // TODO: generate slug from title
  const slug = get(payload, 'slug')
  assert(isString(slug), 'Slug string is required')

  const titleLanguages = getFieldLanguages(payload, 'title')
  const captionLanguages = getFieldLanguages(payload, 'caption')
  const contentLanguages = getFieldLanguages(payload, 'content')
  const languages = uniq(flatten([titleLanguages, captionLanguages, contentLanguages]))

  const fallbackName = flatten(['en'], titleLanguages)
    .reduce((title, languageCode) => title || get(payload.title, languageCode), null)

  const resourceProperties = {
    mimetype: mimeTypePrefix, // NOTE: it is actually the prefix.
    full_mimetype: mimeType,
    type: resourceType,
    slug,
    languages,
    start_date: startDate,
    end_date: endDate,
    name: get(payload, 'name', fallbackName),
    previous_resource_uuid: get(payload, 'previous_resource_uuid'),
  }

  const indexContent = get(payload, 'index_content', false)

  titleLanguages.forEach(languageCode => {
    resourceProperties[`title_${languageCode}`] = get(payload.title, languageCode)
  })
  captionLanguages.forEach(languageCode => {
    resourceProperties[`caption_${languageCode}`] = get(payload.caption, languageCode)
  })
  contentLanguages.forEach(languageCode => {
    resourceProperties[`url_${languageCode}`] = generateContentUrl(get(payload.content, languageCode), mimeType)
    if (indexContent && isText(mimeType)) {
      resourceProperties[`content_${languageCode}`] = get(payload.content, languageCode)
    }
  })

  return resourceProperties
}

module.exports = {
  convertResourcePayloadToNewResourceProperties
}
