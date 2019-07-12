/* eslint-env browser */
/* globals angular, TopicModellingTimeline */
angular.module('histograph')
  // eslint-disable-next-line prefer-arrow-callback
  .directive('hiTopicModellingTimeline', function directive() {
    return {
      restrict: 'A',
      scope: {
        topicModellingData: '=hiTopicModellingData',
        extraFrequenciesData: '=hiExtraFrequenciesData',
        setBinsCount: '=hiSetBinsCount',
        itemClickHandler: '=hiItemClickHandler'
      },
      template: `
        <div class="svg-container"></div>
      `,
      link: function link(scope, element) {
        const root = element[0].querySelector('.svg-container')

        const timeline = new TopicModellingTimeline(root, {
          onDesiredNumberOfTimestepsChange: val => {
            if (scope.setBinsCount) {
              scope.setBinsCount(val)
            }
          },
          itemClickHandler: e => {
            if (scope.itemClickHandler) {
              scope.itemClickHandler(e)
            }
          }
        })

        if (scope.setBinsCount) {
          setTimeout(() => {
            scope.setBinsCount(timeline.getDesiredNumberOfTimesteps())
          })
        }

        setTimeout(() => timeline.render())

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
