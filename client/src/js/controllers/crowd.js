/**
 * @ngdoc function
 * @name histograph.controller:CrowdCtrl
 * @description
 * # CrowdCtrl
 * Handle crowdsourcing notification and points
 * 
 */
angular.module('histograph')
  .controller('CrowdCtrl', function($scope, $log, $timeout) {
    $scope.short_delay = 10000;
    $scope.long_delay = 10000;
    
    $scope.challenge = {
      question: '', // 'does {:x} appear in {:y}?'
      type: 'first_type', 
      resource: {},
      entity: { },// the entity and its parent,
      entities: [] // or the list of entities...
    };

    /*
      Get the first avaialbe challenge for the user, addressing user
      favourite element first. Cfr server
    */
    $scope.challenge = function() {
      $log.debug('CrowdCtrl -> challenge()');
    };


    /*
      Ask me later (5 min)
      @todo save a cookie, to be parsed on ctrl init
    */
    $scope.pause = function() {
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