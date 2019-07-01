const {
  get, isString, first,
  values, groupBy, toPairs,
  uniq, chain, flatten
} = require('lodash')
const YAML = require('yamljs')

const helpers = require('../../../helpers')

const TypeMapping = {
  LOC: 'location',
  PER: 'person',
  ORG: 'organization',
  UNK: 'organization'
}

const UniqueEntityFields = [
  'wikidata_id',
  'dbpedia_uri',
  'google_kg_id',
  'viaf_id'
]

const LinksFields = [
  'wikidata_id',
  'dbpedia_uri',
  'google_kg_id',
  'wikipedia_uri',
  'viaf_id',
  'external_url'
]

/**
 * C2DH Nerd entities do not have an ID but we know
 * that disambiguated entities have third party IDs that
 * uniquely identify them.
 *
 * If no such IDs are provided with the entity we can
 * use 'label'.
 * @param {C2dhEntity} entity
 * @return {string}
 */
function getEntityId(entity) {
  const ids = UniqueEntityFields
    .map(f => get(entity, `matched_resource.${f}`))
    .filter(isString)
  return first(ids) || get(entity, 'matched_resource.label')
}

/**
 *
 * @param {array} pairs a list of: [<language_code>, <entity>] where
 * the whole list is one resolved entity.
 * @return {Entity} a histograph entity ready to be saved in the DB.
 */
function c2dhNerLanguageAndEntityPairsToHistographEntityProperties(pairs) {
  if (pairs.length === 0) return undefined

  const languages = uniq(pairs.map(([lang]) => lang))
  const [, firstEntity] = first(pairs)
  const matchedResource = firstEntity.matched_resource

  // TODO: Taking label of the first entity which may not be
  // the best thing in case of a multi language entity.
  const name = get(matchedResource, 'label') || get(firstEntity, 'entity')
  const description = get(matchedResource, 'description') || undefined

  const contexts = toPairs(groupBy(pairs, ([lang]) => lang))
    .map(([language, groupPairs]) => {
      const context = groupPairs.map(([, entity]) => ({
        left: entity.left,
        right: entity.right
      }))
      return {
        language,
        context
      }
    })

  const entity = {
    name,
    slug: helpers.text.slugify(name),
    type: TypeMapping[get(matchedResource, 'tag')],
    languages,
    frequency: pairs.length,
    contexts,
  }

  LinksFields.forEach(field => {
    const value = get(matchedResource, field)
    if (isString(value)) {
      entity[`links__${field}`] = value
    }
  })

  if (description) {
    entity.description = description
  }

  return entity
}

/**
 *
 * @param {array} languageAndEntityPairs an array of:
 * ['<lang-code>', '<c2dh-nerd-entity>']
 * @return {Entity} a histograph entity ready to be saved in the DB.
 */
function c2dhNerdToHistographEntityPropertiesList(languageAndEntityPairs) {
  const grouper = ([, entity]) => getEntityId(entity)
  const languageAndEntityPairsGroups = values(groupBy(languageAndEntityPairs, grouper))
  return languageAndEntityPairsGroups.map(c2dhNerLanguageAndEntityPairsToHistographEntityProperties)
}

/**
 *
 * @param {list} entityAndContextPairs a list of: [<Entity>, [<contexts>] ] where
 * `context` is build by `c2dhNerLanguageAndEntityPairsToHistographEntityProperties`
 *
 */
function buildAnnotationPropertiesListFromEntityContextsPairs(entityAndContextsPairs, method) {
  return chain(entityAndContextsPairs)
    .map(([entity, contexts]) => contexts.map(({ language, context }) => ({
      id: entity.props.uuid,
      language,
      context
    })))
    .flatten()
    .groupBy('language')
    .toPairs()
    .map(([language, item]) => ({
      language,
      service: method,
      yaml: YAML.stringify(
        flatten(item.map(({ id, context: contexts }) => contexts.map(
          context => ({ id, context })
        ))),
        2
      )
    }))
    .value()
}

module.exports = {
  c2dhNerdToHistographEntityPropertiesList,
  buildAnnotationPropertiesListFromEntityContextsPairs
}
