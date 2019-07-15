/* eslint-env browser */
/* globals angular */
angular.module('histograph')
  // eslint-disable-next-line prefer-arrow-callback, func-names
  .controller('TopicModellingCtrl', function (
    $scope, $log, $location,
    TopicModellingAspectsService,
    TopicModellingScoresService, EVENTS,
    ResourceFactory
  ) {
    $scope.aspectFilter = { selectedValues: [] }
    $scope.busyCounter = 0
    $scope.criteria = $location.search()

    $scope.resourcesPageLimit = 10

    $scope.$on(EVENTS.API_PARAMS_CHANGED, (e, params) => {
      const { from, to } = params
      $scope.criteria = { from, to }
    })

    $scope.addOrRemoveAspectFilterValue = value => {
      if ($scope.aspectFilter.selectedValues.indexOf(value) >= 0) {
        $scope.aspectFilter.selectedValues = $scope.aspectFilter
          .selectedValues.filter(v => v !== value)
      } else {
        $scope.aspectFilter.selectedValues.push(value)
      }
    }

    $scope.clearAspectFilter = () => {
      $scope.aspectFilter.selectedValues = []
    }

    $scope.setBinsCount = val => {
      $scope.binsCount = val
    }

    $scope.loadMoreResources = () => {
      ResourceFactory.get({
        limit: $scope.resourcesPageLimit,
        offset: $scope.selectedResources.length,
        from_uuid: $scope.selectedItemMeta.firstResourceUuid,
        to_uuid: $scope.selectedItemMeta.lastResourceUuid,
        from: $scope.selectedItemMeta.minStartDate.replace(/T.*$/, ''),
        to: $scope.selectedItemMeta.maxEndDate.replace(/T.*$/, ''),
      }).$promise
        .then(results => {
          $scope.selectedResources = $scope.selectedResources.concat(results.result.items)
          $scope.totalItems = results.info.total_items
        })
        .catch(e => {
          $log.error('Could not get resources from the API', e.message)
        })
    }

    $scope.itemClickHandler = ({ stepIndex, topicIndex }) => {
      const meta = $scope.topicModellingData.aggregatesMeta[stepIndex]
      $log.info('Topic item selected', stepIndex, topicIndex, meta)
      $scope.selectedItemMeta = meta
      $scope.selectedResources = []
      $scope.totalItems = 0

      if (meta.totalResources === 1) {
        ResourceFactory.get({
          id: meta.firstResourceUuid,
        }).$promise
          .then(results => {
            $log.info('Selection results', results)
            $scope.selectedResources = [results.result.item]
            $scope.totalItems = 1
          })
          .catch(e => {
            $log.error('Could not get resources from the API', e.message)
          })
      } else {
        ResourceFactory.get({
          limit: $scope.resourcesPageLimit,
          offset: $scope.selectedResources.length,
          from_uuid: meta.firstResourceUuid,
          to_uuid: meta.lastResourceUuid,
          from: meta.minStartDate.replace(/T.*$/, ''),
          to: meta.maxEndDate.replace(/T.*$/, ''),
        }).$promise
          .then(results => {
            $log.info('Selection results', results)
            $scope.selectedResources = results.result.items
            $scope.totalItems = results.info.total_items
          })
          .catch(e => {
            $log.error('Could not get resources from the API', e.message)
          })
      }
    }

    $scope.$watch('optionalFeatures.topicModellingTimeline', val => {
      if (!val) return

      const { aspectFilteringEnabled, aspect } = val

      if (aspectFilteringEnabled && !$scope.aspectFilter.filterKey) {
        $scope.busyCounter += 1
        TopicModellingAspectsService
          .get({ aspect, extra: 'filter-values' }).$promise
          .then(data => {
            $scope.aspectFilter = {
              selectedValues: $scope.aspectFilter.selectedValues,
              values: data.values,
              label: data.filterLabel,
              filterKey: data.filterKey,
              aspect
            }
          })
          .catch(e => $log.error(e))
          .finally(() => { $scope.busyCounter -= 1 })
      }
    })

    $scope.$watch(
      () => ({
        bins: $scope.binsCount,
        criteria: $scope.criteria,
        filterValues: $scope.aspectFilter.selectedValues,
        aspect: $scope.aspectFilter.aspect
      }),
      ({
        bins, criteria: { from, to }, filterValues, aspect
      }) => {
        if (!bins) return

        $scope.busyCounter += 1
        TopicModellingScoresService.get({ bins, from, to }).$promise
          .then(data => { $scope.topicModellingData = data })
          .catch(e => $log.error(e))
          .finally(() => { $scope.busyCounter -= 1 })

        if (aspect) {
          const params = {
            aspect, bins, from, to
          }
          if ($scope.aspectFilter.filterKey && filterValues) {
            // eslint-disable-next-line prefer-destructuring
            params[$scope.aspectFilter.filterKey] = JSON.stringify(filterValues)
          }

          $scope.busyCounter += 1
          TopicModellingAspectsService.get(params).$promise
            .then(data => { $scope.extraFrequenciesData = data })
            .catch(e => $log.error(e))
            .finally(() => { $scope.busyCounter -= 1 })
        }
      },
      true
    )
  })
  // eslint-disable-next-line prefer-arrow-callback
  .factory('TopicModellingAspectsService', function service($resource) {
    return $resource('/api/resource/topic-modelling/aspects/:aspect/:extra', {}, {})
  })
  // eslint-disable-next-line prefer-arrow-callback
  .factory('TopicModellingScoresService', function service($resource) {
    return $resource('/api/resource/topic-modelling/scores', {}, {})
  })
