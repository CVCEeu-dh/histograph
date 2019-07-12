/* eslint-env browser */
/* globals angular */
angular.module('histograph')
  // eslint-disable-next-line prefer-arrow-callback, func-names
  .controller('TopicModellingCtrl', function (
    $scope, $log, $location,
    TopicModellingAspectsService,
    TopicModellingScoresService, EVENTS
  ) {
    $scope.aspectFilter = { selectedValues: [] }
    $scope.busyCounter = 0
    $scope.criteria = $location.search()

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
        filterValues: $scope.aspectFilter.selectedValues
      }),
      ({
        bins, criteria: { from, to }, filterValues
      }) => {
        if (!bins) return

        $scope.busyCounter += 1
        TopicModellingScoresService.get({ bins, from, to }).$promise
          .then(data => { $scope.topicModellingData = data })
          .catch(e => $log.error(e))
          .finally(() => { $scope.busyCounter -= 1 })

        if ($scope.aspectFilter.aspect) {
          const { aspect } = $scope.aspectFilter
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
