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

function alwaysTrueEntityFilter() {
  return true
}

const Filters = {
  openTapiocaCumulativeScore
}

function getEntityFilter(filterName) {
  return Filters[filterName]
}

module.exports = {
  getEntityFilter,
  alwaysTrueEntityFilter
}
