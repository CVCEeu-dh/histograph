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
    $scope.enable = true; // load from settings
    $scope.steps = {
      'explore.resources': {
        title: 'The gallery',
        steps: [
          0,1, 11
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

    /*
      According to the view we are in
    */
    $scope.nextStep = function(){
      $scope.moveTo($scope.steps[currentState].cursor + 1);
    }


    $scope.previousStep = function() {
      $scope.moveTo($scope.steps[currentState].cursor - 1);
    }


    $scope.moveTo = function(index) {
      
      $scope.hasPrevious = index > 0;
      $scope.hasNext = index < $scope.steps[currentState].steps.length - 1;
      $scope.currentStep = $scope.steps[currentState].steps[index];
      $scope.steps[currentState].cursor = index;
      $log.log('GuidedTourCtrl -> moveTo() cursor:', index, '/', $scope.steps[currentState].steps.length, '- aka touring step n:',  $scope.steps[currentState].steps[index], '- has next:', $scope.hasNext, '- has previous:', $scope.hasPrevious );

      $scope.ttTitle= [
            $scope.steps[currentState].title || '',
            ' (',
            (+$scope.steps[currentState].cursor + 1),
             ' of ',
            $scope.steps[currentState].steps.length,
            ')'
          ].join('');
    }

    /*
      Set the current step to the correct number according to the view we are in
    
    */
    $scope.$on(EVENTS.STATE_CHANGE_SUCCESS, function(){
      $scope.currentStep = -1
    });

    $rootScope.$on(EVENTS.STATE_VIEW_CONTENT_LOADED, function(e, state) {
      currentState = state.name;

      if(__promise)
        $timeout.cancel(__promise);

      if(!$scope.enable)
        return;
      __promise = $timeout(function(){
        if($scope.steps[state.name] && !$scope.steps[state.name].consumed) {

          if(typeof $scope.steps[state.name].cursor == 'undefined')
            $scope.steps[state.name].cursor = 0; // clone;

          

          $scope.moveTo($scope.steps[state.name].cursor);
        }
      }, 3500);
    });
  });