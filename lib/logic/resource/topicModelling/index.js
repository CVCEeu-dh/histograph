const assert = require('assert')
const {
  isEmpty, isNil, chunk, isNumber,
  zip, sum, max, fill, first, last
} = require('lodash')

function getAggregatedTopicModellingScoreFromResourcesBin(items) {
  const scoresList = items.map(item => item.scores).filter(s => !isEmpty(s))
  return zip(...scoresList).map(scores => sum(scores) / scores.length)
}

function fillEmptyScoresWithZeros(scores) {
  const maxLength = max(scores.map(i => i.length))
  const zeros = fill(Array(maxLength), 0)
  return scores.map(i => {
    if (i.length === 0) return zeros
    return i
  })
}

function aggregateResourcesInBinsByCount(results, binsCount, getAggregateFromBinFn) {
  if (isEmpty(results)) {
    return {
      aggregates: [],
      aggregatesMeta: []
    }
  }

  let finalBinsCount = isNil(binsCount)
    ? results.length
    : binsCount
  finalBinsCount = isNil(binsCount) || binsCount > results.length
    ? results.length
    : binsCount
  assert(isNumber(finalBinsCount), `Bins count must be a number: ${binsCount}`)

  const binSize = Math.ceil(results.length / finalBinsCount)
  const bins = chunk(results, binSize)

  const aggregates = bins.map(getAggregateFromBinFn)
  // const resources = bins.map(items => items.map(({ uuid, startDate }) => ({ uuid, startDate })))
  const aggregatesMeta = bins.map(items => ({
    totalResources: items.length,
    minStartDate: first(items).startDate,
    maxStartDate: last(items).startDate,
    minEndDate: first(items).endDate,
    maxEndDate: last(items).endDate,
    firstResourceUuid: first(items).uuid,
    lastResourceUuid: last(items).uuid
  }))

  return {
    aggregates,
    aggregatesMeta
  }
}

module.exports = {
  aggregateResourcesInBinsByCount,
  getAggregatedTopicModellingScoreFromResourcesBin,
  fillEmptyScoresWithZeros
}
