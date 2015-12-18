/**
 * @ngdoc function
 * @name histograph.controller:CrowdCtrl
 * @description
 * # CrowdCtrl
 * Handle crowdsourcing notification and points
 * 
 */
angular.module('histograph')
  .controller('CrowdCtrl', function($scope, $log, $timeout, UserFactory) {
    $scope.short_delay = 500;
    $scope.long_delay = 2500;

    $scope.isVisible = false;
    $scope.isChallengeAccepted = false;

    $scope.question = 'none';

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
        extra: 'unknownpeople'
      }, function(res) {
        $log.log('CrowdCtrl -> challenge() --> ', res);
        $scope.isVisible = true;
        $scope.isChallengeAccepted = false;
        $scope.task = res.result.item;

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
        extra: 'unknownpeople'
      }, function(res) {
        $log.log('CrowdCtrl -> challenge() --> ', res);
        
        $scope.isChallengeAccepted = true;
        $scope.task = res.result.item;

      });

    }


    $scope.challengeAccepted = function() {
      $log.log('CrowdCtrl -> challengeAccepted()');
      $scope.isChallengeAccepted = true;
      $scope.question = 'challenge_accepted';
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