'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application.
 */
angular.module('histograph')
  .directive('annotorious', function() {
    return {
      restrict : 'A',
      link : function(scope, element) {
        element.bind("load" , function(e){ 
          anno.makeAnnotatable(this);
        })
      }
    };
  });
