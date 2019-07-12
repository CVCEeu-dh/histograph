const decypher = require('decypher')
const { flatten, max, includes } = require('lodash')

const { getQueryMethod } = require('../../../util/neo4j')
const { aggregateResourcesInBinsByCount } = require('.')

const resourceQueries = decypher(`${__dirname}/../../../../queries/resource.cyp`)
const entityQueries = decypher(`${__dirname}/../../../../queries/entity.cyp`)

async function getForeignersRatio(fromTime, toTime, binsCount, options = {}) {
  const { excludingCountries = [] } = options

  const results = await getQueryMethod()(
    resourceQueries.find_with_nationality_aspect,
    {
      start_time: fromTime,
      end_time: toTime
    }
  )
  const personsWithNationalitiesCountPerBin = []

  const result = aggregateResourcesInBinsByCount(results, binsCount, resources => {
    const nationalities = flatten(resources.map(r => r.nationalities))
    personsWithNationalitiesCountPerBin.push(nationalities.length)
    return nationalities.filter(n => !includes(excludingCountries, n)).length
  })

  // normalise to maximum number of persons with nationalities per bin.
  const maxPersonsCount = max(personsWithNationalitiesCountPerBin)
  return {
    aggregates: result.aggregates.map(i => i / maxPersonsCount),
    aggregatesMeta: result.aggregatesMeta,
    label: 'Persons'
  }
}

async function getNationalityValues() {
  const values = (await getQueryMethod()(
    entityQueries.get_unique_field_values,
    {
      field_name: 'metadata__nationality',
      type: 'person'
    }
  )).map(e => e.value)
  return {
    values,
    filterKey: 'excludingCountries',
    filterLabel: 'Excluding nationals of'
  }
}

module.exports = {
  aspectRetrievers: {
    'foreigners-ratio': getForeignersRatio
  },
  filterValuesRetrievers: {
    'foreigners-ratio': getNationalityValues
  }
}
