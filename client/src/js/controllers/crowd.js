/**
 * @ngdoc function
 * @name histograph.controller:CrowdCtrl
 * @description
 * # CrowdCtrl
 * Handle crowdsourcing notification and points
 * 
 */
angular.module('histograph')
  .controller('CrowdCtrl', function($scope, $log, $state, $timeout, UserFactory) {
    $scope.short_delay = 180 * 1000;
    $scope.long_delay = 360 * 1000;

    $scope.isVisible = false;
    $scope.isChallengeAccepted = false;

    $scope.question = 'none';

    var availableTasks = ['unknownpeople', 'resourcelackingdate'];
    /*
      Get the first avaialbe challenge for the user, addressing user
      favourite element first. Cfr server
    */
    $scope.challenge = function() {
      $log.debug('CrowdCtrl -> challenge()');
      // it can be opened from a btn
      if(popper)
        $timeout.cancel(popper);
      //
      UserFactory.get({
        method: 'task',
        extra: _.first(_.shuffle(availableTasks))
      }, function(res) {
        $log.log('CrowdCtrl -> challenge() --> ', res);
        if(res.status == 'empty')
          return;
        $scope.isVisible = true;
        $scope.isChallengeAccepted = false;
        $scope.task = res.result.item;
        $scope.taskName = res.info.what;
      });
    };

    $scope.nextChallenge = function() {
      // it can be opened from a btn
      if(popper)
        $timeout.cancel(popper);

      $scope.isChallengeAccepted = true;
      $scope.isVisible = true;
      //
      UserFactory.get({
        method: 'task',
        extra: _.first(_.shuffle(availableTasks))
      }, function(res) {
        $log.log('CrowdCtrl -> challenge() --> ', res);
        
        $scope.isChallengeAccepted = true;
        $scope.task = res.result.item;
        $scope.taskName = res.info.what;
      });

    }


    $scope.challengeAccepted = function() {
      $log.log('CrowdCtrl -> challengeAccepted()');
      $scope.isChallengeAccepted = true;
      $scope.question = 'challenge_accepted';
      // according to task type, decide what to do next
      if($scope.taskName == 'unknownpeople')
        $state.go('entity.resources', {
          id: $scope.task.person.id
        })
        // $scope.inspect([ $scope.task.person.id]);
      if($scope.taskName == 'resourcelackingdate')
        $state.go('resource.resources', {
          id: $scope.task.resource.id
        })
    };

    /*
      Ask me later (5 min)
      @todo save a cookie, to be parsed on ctrl init
    */
    $scope.pause = function() {
      $scope.isVisible = false;
      $scope.isChallengeAccepted = false;
      $scope.question='none';
      $log.debug('CrowdCtrl -> pause()');
      if(popper)
        $timeout.cancel(popper);
      popper = $timeout($scope.start, $scope.long_delay);
    };


    /*
      Start crowdsourcing timer
    */
    $scope.start = function() {
      $log.debug('CrowdCtrl -> start()');
      if(popper)
        $timeout.cancel(popper);
      popper = $timeout($scope.challenge, $scope.short_delay);
    };


    // automaticall call start function after $scope.delay ms
    var popper;
    

    $log.debug('CrowdCtrl ready');
    $scope.start();
  });