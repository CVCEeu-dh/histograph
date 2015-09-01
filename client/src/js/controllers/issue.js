/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('IssueCtrl', function ($scope, $log, $stateParams, ResourceRelatedFactory, socket) {
    $log.debug('IssueCtrl ready, resource id:', $stateParams.id, '- inquiry id:', $stateParams.inquiry_id);
  })
  .controller('IssueCreateCtrl', function ($scope, $log, $stateParams, ResourceRelatedFactory, socket) {
    $log.debug('IssueCreateCtrl ready, resource id:', $stateParams.id, 'type', $stateParams.type);
    
    var defaultTitles = {
      'date': 'Main date is not correct or is not found',
      'title':'The title of the document is not correct'
    }
    
    // the current, empty inquiry
    $scope.issue = {
      type: $stateParams.type,
      title: defaultTitles[$stateParams.type],
      description: 'no description',
      language: $scope.language
    };
    
    $scope.createIssue = function () {
      if($scope.issue.type == 'date')
        ResourceRelatedFactory.save({
          model: 'issue',
          id: $stateParams.id
        }, {
          type: 'date',
          solution: [$scope.start_date, $scope.end_date],
          description: $scope.issue.description || '',
          title: $scope.issue.title || ''
        }, function(res) {
          console.log(res)
          //$modalInstance.close();
        });
    };
   
  })