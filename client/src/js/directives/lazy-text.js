'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application. require marked
 */
angular.module('histograph')
  .directive('lazytext', function($compile, $log, $http) {
    return {
      restrict : 'A',
      template: '<div>url: {{url}}</div>',
      scope:{
        url: '='
      },
      link : function(scope, element, attrs) {
        $log.log('::lazi-text ready', scope.url);
        $http.get('/txt/' + scope.url).then(function(res) {
          element.html(res.data);
        });
      }
    }
  })