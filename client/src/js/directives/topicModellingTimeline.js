/* eslint-env browser */
/* globals angular, TopicModellingTimeline */
angular.module('histograph')
  // eslint-disable-next-line prefer-arrow-callback
  .directive('hiTopicModellingTimeline', function directive() {
    return {
      restrict: 'A',
      scope: {
        settings: '=hiTopicModellingTimeline',
        isVisible: '=hiTopicModellingTimelineVisible'
      },
      template: `
        <div class="svg-container"></div>
        <div class="aspect-value-selector" ng-if="aspectFilter">
          <div class="btn-group" uib-dropdown is-open="false">
            <button id="topic-modelling-aspect-value-selector-btn" type="button" class="btn btn-default btn-line" uib-dropdown-toggle>
              {{aspectFilter.label}} {{ aspectFilter.value }} <span class="caret"></span>
            </button>
            <ul class="uib-dropdown-menu dropdown-menu" role="menu" aria-labelledby="topic-modelling-aspect-value-selector-btn">
              <li class="{{aspectFilter.value === item ? 'active' : ''}}" ng-repeat="item in aspectFilter.values">
                <a ng-click='setAspectFilterValue(item)'>{{item}}</a>
              </li>
            </ul>
          </div>
        </div>
      `,
      controller: function controller($scope, $location, $log,
        TopicModellingScoresService, TopicModellingAspectsService, EVENTS) {
        // $log.info('Topic modelling timeline ctrl intitialized.')

        if (!$scope.settings) $scope.settings = {}

        $scope.aspectFilter = {}

        $scope.criteria = $location.search()

        $scope.$on(EVENTS.API_PARAMS_CHANGED, (e, params) => {
          const { from, to } = params
          $scope.criteria = { from, to }
        })

        $scope.setAspectFilterValue = value => {
          $scope.aspectFilter.value = value
        }

        $scope.$watch(
          () => ({
            bins: $scope.binsCount,
            settings: $scope.settings,
            criteria: $scope.criteria,
            filterValue: $scope.aspectFilter.value
          }),
          ({
            bins, settings, criteria: { from, to }, filterValue
          }) => {
            if (!bins) return

            TopicModellingScoresService.get({ bins, from, to }).$promise
              .then(data => { $scope.topicModellingData = data })
              .catch(e => $log.error(e))

            const aspect = settings
              ? settings.aspect
              : undefined

            if (aspect) {
              if (!$scope.aspectFilter.filterKey && settings.aspectFilteringEnabled) {
                TopicModellingAspectsService
                  .get({ aspect, extra: 'filter-values' }).$promise
                  .then(data => {
                    $scope.aspectFilter = {
                      value: data.values[0],
                      values: data.values,
                      label: data.filterLabel,
                      filterKey: data.filterKey
                    }
                  })
                  .catch(e => $log.error(e))
              }

              const params = {
                aspect, bins, from, to
              }
              if ($scope.aspectFilter.filterKey && filterValue) {
                params[$scope.aspectFilter.filterKey] = filterValue
              }

              TopicModellingAspectsService.get(params).$promise
                .then(data => { $scope.extraFrequenciesData = data })
                .catch(e => $log.error(e))
            }
          },
          true
        )
      },
      link: function link(scope, element) {
        const root = element[0].querySelector('.svg-container')

        const timeline = new TopicModellingTimeline(root, {
          extraFrequenciesLabel: scope.settings.aspectLabel,
          onDesiredNumberOfTimestepsChange: val => {
            // eslint-disable-next-line no-param-reassign
            scope.binsCount = val
            scope.$digest()
          }
        })

        setTimeout(() => {
          // eslint-disable-next-line no-param-reassign
          scope.binsCount = timeline.getDesiredNumberOfTimesteps()
          scope.$digest()
        })

        scope.$watch('isVisible', () => {
          setTimeout(() => timeline.render())
        })

        scope.$watch('topicModellingData', data => {
          if (!data) return

          // Organise topic scores. If we get all zeros for an aggregation step,
          // we replace this step with all '0.5' to display the step as a
          // 'all equal' topics step.
          // eslint-disable-next-line no-param-reassign
          scope.topicsScores = data.aggregates.map(scores => {
            const zeros = scores.filter(s => s === 0)
            if (zeros.length === scores.length) return scores.map(() => 0.5)
            return scores
          })
          timeline.setData({
            topicsScores: scope.topicsScores,
            extraFrequencies: scope.extraFrequencies
          })
        })

        scope.$watch('extraFrequenciesData', data => {
          if (!data) return
          // eslint-disable-next-line no-param-reassign
          scope.extraFrequencies = data.aggregates
          if (scope.topicsScores === undefined) return

          timeline.setData({
            topicsScores: scope.topicsScores,
            extraFrequencies: scope.extraFrequencies
          }, {
            extraFrequenciesLabel: data.label
          })
        })
      }
    }
  })
  // eslint-disable-next-line prefer-arrow-callback
  .factory('TopicModellingScoresService', function service($resource) {
    return $resource('/api/resource/topic-modelling/scores', {}, {})
  })
  // eslint-disable-next-line prefer-arrow-callback
  .factory('TopicModellingAspectsService', function service($resource) {
    return $resource('/api/resource/topic-modelling/aspects/:aspect/:extra', {}, {})
  })
