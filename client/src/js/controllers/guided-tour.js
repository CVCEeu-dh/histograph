/**
 * @ngdoc function
 * @name histograph.controller:GuidedTourCtrl
 * @description
 * # GuidedTourCtrl
 * Handle guided tour stuff
 * 
 */
angular.module('histograph')
  .controller('GuidedTourCtrl', function ($rootScope, $scope, $log, $timeout, EVENTS) {
    $log.debug('GuidedTourCtrl ready');
    
    $scope.currentStep = -1;
    $scope.currentView; 
    $scope.enable = false;
    $scope.steps = {
      'explore.resources': {
        steps: [
          0,1
        ]
      }, 
      'resource.resources': {
        steps: [
          5,6
        ]
      },
      'explore.projection': {
        steps: [
          10
        ]
      }
    };

    var currentState,
        __promise;

    $scope.showNext = false;
    $scope.showPrevious = false;
    /*
      According to the view we are in
    */
    $scope.nextStep = function(){
      $scope.currentStep ++;
    }

    $scope.previousStep = function() {
      $scope.currentStep--;
    }

    /*
      Set the current step to the correct number according to the view we are in
    
    */
    $rootScope.$on(EVENTS.STATE_VIEW_CONTENT_LOADED, function(e, state) {
      currentState = state.name;

      if(__promise)
        $timeout.cancel(__promise);
      
      if(!$scope.enable)
        return;
      __promise = $timeout(function(){
        if($scope.steps[state.name] && !$scope.steps[state.name].consumed) {
          $scope.currentStep = $scope.steps[state.name].steps[$scope.steps[state.name].current || 0]
          $scope.steps[state.name].current = +$scope.currentStep; // clone;
        }
      }, 3500)
    });
  });