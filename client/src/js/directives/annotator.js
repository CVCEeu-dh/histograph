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
  .directive('annotator', function() {
    return {
      restrict : 'A',
      scope:{
        marked: '='
      },
      link : function(scope, element, attrs) {
        Annotator.Plugin.HelloWorld = (function() {

          function HelloWorld(element, options) {
            this.element = element;
            this.options = options;
            console.log("Hello World!");
          }

          HelloWorld.prototype.pluginInit = function() {
            console.log("Initialized with annotator: ", this.annotator);
          };

          return HelloWorld;
        })();
        // if( element.html().length > 0)
        //   $(element[0]).annotator().annotator('addPlugin', 'HelloWorld')
        // console.log("annotator",  )
        scope.$watch('marked', function(val) {
          if(!val)
            return;
            element.html(marked(scope.marked));
            element.annotator()
        })
        
      }
    }
  })