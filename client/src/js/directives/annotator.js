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
  .directive('annotator', function($compile) {
    return {
      restrict : 'A',
      scope:{
        marked: '=',
        context: '='
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
        
        var entities = [],
            renderer = new marked.Renderer();
        // chenge how marked interpred link for this special directive only
        renderer.link = function(href, title, text) {
          var localEntitiesIds = href.split(','),
              localEntities = [];
          
          localEntities = entities.filter(function (d) {
            return localEntitiesIds.indexOf(''+d.id) !== -1;
          })

          // it has been abandoned... sad
          if(!localEntities.length) {
            return text
          }
          // rewrite localentities better.
          localEntities = localEntities.map(function (d) {
            return d.name
          }).join(' - ')
          return '<a tooltip="' + localEntities + '">' + text + '</a>';
        };


        scope.$watch('marked', function(val) {
          if(!val)
            return;
          // organise(merge) entitites
          entities = scope.context.locations.concat(scope.context.persons)
          
          element.html(marked(scope.marked, {
            renderer: renderer
          }));

          $compile(element.contents())(scope);
          element.annotator()
        })
        
      }
    }
  })