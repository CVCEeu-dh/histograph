/**
 * @ngdoc function
 * @name histograph.controller:GuidedTourCtrl
 * @description
 * # GuidedTourCtrl
 * Handle guided tour stuff
 * 
 */
angular.module('histograph')
  .controller('GuidedTourCtrl', function ($rootScope, $scope, $log, $timeout, localStorageService, EVENTS) {
    'use-strict';
    $log.debug('GuidedTourCtrl ready');
    
    $scope.currentStep = -1;
    $scope.currentView; 
    $scope.enabled = true; // load from settings
    $scope.consumed = false;
    $scope.ignoreSkipTip = false;

    $scope.steps = {
      'explore.resources': {
        title: 'Gallery view', // default titles
        steps: [
          {
            id: 0,
            title: 'Welcome to histograph'
          }, 1,2,3,{
            id: 4,
            title: 'Timeline'
          },
          { id: 5,
            title: 'Resources'
          }
        ]
      }, 
      'resource.resources': {
        title: 'Resource page',
        steps: [
          8,9,10,16,14,15, 11, {
            id:17,
            title: 'Notifications'
          }
        ]
      },
      'explore.projection': {
        title: 'Graph view', // default titles
        steps: [
          12
        ]
      },
      'skip-tour': {
        steps: [
         13
        ]
      }
    };

    var currentState,
        __promise;

    /*
      Load the guided tour status from your local storage, if available.
      Global guided tour can be disabled via cookies.
    */
    $scope.loadCursors = function () {
      var cursors = localStorageService.get('guidedtour');
      if(!cursors) {
        $log.log('GuidedTourCtrl -> loadCursors(), filling localstorage ...');
        $scope.saveCursors();
        return
      }
      for(var i in cursors) {

        if($scope.steps[i]) {
          $scope.steps[i].cursor = isNaN(cursors[i].cursor)? 0: cursors[i].cursor;
          $scope.steps[i].consumed = cursors[i].consumed;
        }
      }

      if(cursors.enabled)
        $scope.enabled = (!!cursors.enabled) || true;
      // prevent the helper popoup that indicates how to start over to appear twice
      if(cursors.ignoreSkipTip) {
        $scope.ignoreSkipTip = true;
      }
      $log.log('GuidedTourCtrl -> loadCursors() - cursors:', cursors, '- enable:', $scope.enabled, '- steps:', $scope.steps);

    }

    $scope.saveCursors = function() {
      var cursors = {};
      for(var i in $scope.steps) {
        cursors[i] = {
          cursor: $scope.steps[i].cursor || 0,
          consumed: $scope.steps[i].consumed
        }
      }
      cursors.enabled = $scope.enabled;
      $log.log('GuidedTourCtrl -> saveCursors() - cursors:', cursors, '- enable:', cursors.enabled);
      cursors.ignoreSkipTip = $scope.ignoreSkipTip;
      localStorageService.set('guidedtour', cursors);
    }
    

    /*
      According to the view we are in
    */
    $scope.nextStep = function(){
      $scope.moveTo($scope.steps[currentState].cursor + 1);
    }


    $scope.previousStep = function() {
      var cursor = Math.max(0, $scope.steps[currentState].cursor - 1);

      if($scope.byebye) {
        cursor++;
        $scope.byebye = false;
      }

      $scope.moveTo(cursor);
    }

    $scope.finish = function(){
      // save the completion?
      $scope.skip();
    }


    $scope.skip = function() {
      $scope.steps[currentState].consumed=true;
      $scope.saveCursors();

      // if($scope.ignoreSkipTip){
      //   $scope.currentStep = -1;
      //   return;
      // };
      
      $scope.currentStep = $scope.steps['skip-tour'].steps[0];
      $scope.hasPrevious = false;
      $scope.hasNext = false;
      $scope.byebye = true;
      $scope.ttTitle = "See you later!";

    }

    $scope.confirmSkip = function(){
      $scope.currentStep = -1;
      $scope.ignoreSkipTip=true;

      $scope.saveCursors();
    }

    $scope.moveTo = function(index) {
      
      $scope.hasPrevious = index > 0;
      $scope.hasNext = index < $scope.steps[currentState].steps.length - 1;
     

      var stepId,
          stepTitle; 
      // if there is a detailed step id
      if(typeof $scope.steps[currentState].steps[index] == 'number'){
        stepId = $scope.steps[currentState].steps[index];
        stepTitle = $scope.steps[currentState].title;
      } else {
        stepId = $scope.steps[currentState].steps[index].id;
        stepTitle = $scope.steps[currentState].steps[index].title;
      }

      $scope.currentStep = stepId;
      $scope.steps[currentState].cursor = index;
      

      $scope.ttTitle= [stepTitle || ''].concat($scope.steps[currentState].steps.length > 1? [ 
            ' (',
            (+$scope.steps[currentState].cursor + 1),
             ' of ',
            $scope.steps[currentState].steps.length,
            ')']: []).join('');

      $scope.steps[currentState].consumed = index == $scope.steps[currentState].steps.length - 1;

      $scope.consumed = !!$scope.steps[currentState].consumed;

      $log.log('GuidedTourCtrl -> moveTo() cursor:', index+1, '/', $scope.steps[currentState].steps.length, '- aka touring step id:',  stepId, '- has next:', $scope.hasNext, '- has previous:', $scope.hasPrevious, '- consumed:',  $scope.steps[currentState].consumed);
      $scope.saveCursors();
    }

    $scope.start = function() {
      $log.log('GuidedTourCtrl -> start() state:', currentState)
      if(!currentState)
        return;
      if($scope.forceStart)
        $scope.steps[currentState].cursor = 0; // clone;
      $scope.forceStart = false;
      $scope.byebye = false;
      $scope.consumed = false;
      $scope.moveTo($scope.steps[currentState].cursor || 0);
    }
    /*
      Set the current step to the correct number according to the view we are in
    
    */
    $scope.$on(EVENTS.STATE_CHANGE_SUCCESS, function(){
      $scope.currentStep = -1;
      currentState = false;
    });

    $rootScope.$on(EVENTS.STATE_VIEW_CONTENT_LOADED, function(e, state) {
      currentState = state.name;

      if(__promise)
        $timeout.cancel(__promise);

      if(!$scope.enabled)
        return;
      __promise = $timeout(function(){
        if($scope.steps[state.name] && (!$scope.steps[state.name].consumed || $scope.forceStart)) {
          $log.log('GuidedTourCtrl @EVENTS.STATE_VIEW_CONTENT_LOADED ready for', state.name)
          $scope.start();
        } else if($scope.steps[state.name] && $scope.steps[state.name].consumed) {
          $log.log('GuidedTourCtrl @EVENTS.STATE_VIEW_CONTENT_LOADED nothing to do, the guided tour has already been completed for the', state.name, 'view');
        }
      }, 3500);
    });

    $rootScope.$on(EVENTS.START_GUIDED_TOUR, function(){
      $scope.forceStart = true;
      $scope.start();
       $log.log('GuidedTourCtrl @EVENTS.START_GUIDED_TOUR', currentState);
    })

    /*
      load settings and current cursors from localstorage
    */
    $scope.loadCursors();
  });