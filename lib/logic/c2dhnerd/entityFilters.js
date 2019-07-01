const { get } = require('lodash')

/**
 * NOTE: heuristics while developing pipeline.
 * Noticed that in opentapioca an entity looks like an OK match
 * if the sum of scores of entity (NER) and matched resource (NED) is greater than 24
 */
function openTapiocaCumulativeScore(entity) {
  const totalScore = get(entity, 'score', 0) + get(entity, 'matched_resource.score', 0)
  return totalScore > 24
}

/**
 * Some heuristics when using NED "fusion-flair-custom_entities-gkg"
 */
function cumulativeScoreHeuristics(entity) {
  const entityScore = get(entity, 'score', 1.0)
  const resourceModel = get(entity, 'matched_resource.model')
  const resourceScore = get(entity, 'matched_resource.score', 1.0)

  const cumulativeScore = entityScore * resourceScore
  if (resourceModel === 'gkg') {
    return cumulativeScore > 100
  }
  if (resourceModel && resourceModel.startsWith('external:')) {
    return cumulativeScore > 0.9
  }
  return true
}

function alwaysTrueEntityFilter() {
  return true
}

const Filters = {
  openTapiocaCumulativeScore,
  cumulativeScoreHeuristics
}

function getEntityFilter(filterName) {
  return Filters[filterName]
}

module.exports = {
  getEntityFilter,
  alwaysTrueEntityFilter
}
