/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Show snippets
 * scope: target
 * Use suggestFactory as service
 */
angular.module('histograph')
  .directive('snippets', function ($log, $location, $timeout, EVENTS, SuggestFactory) {
    'use strict';
     return {
      restrict : 'A',
      templateUrl: 'templates/partials/helpers/snippet.html',
      scope:{
        target: '='
      },
      link: function(scope, elem){
        $log.log('::snippets ------------');

        var __fadeOutTimer;


        scope.status = 'disabled';

        // will contain the target, explained
        scope.items = [];
        // will contain the inbetween items between target4S EDGE nodes
        scope.sharedItems = [];
        /*
          Show snippet
        */
        scope.show = function(target) {
          $log.log('::snippets -> show() type:', target.type);
          scope.status = 'loading';

          var items = [];
          if(target.type == 'node') {
            items.push(target.data.node.id);
          } else if(target.type == 'edge') {
            var s = target.data.edge.nodes.source,
                t = target.data.edge.nodes.target;

            scope.left = s;
            scope.right =  t;
            scope.weight = target.data.edge.weight;

            items.push(s.id, t.id);
            // same type? loaded shared resources
            if(s.type == t.type) {
              SuggestFactory.getShared({
                ids: items,
                model: s.type == 'resource'? 'person': 'resource'
              }, function (res) {
                if(res.result && res.result.items.length)
                  scope.sharedItems = res.result.items;
              })
            }
          }

          if(items.length > 0) 
            SuggestFactory.getUnknownNodes({
              ids: items
            }, function (res) {
              // do not remove items
              clearTimeout(__fadeOutTimer)
              scope.status = 'enabled'
              $log.log('::snippets -> show()', res);
              if(res.result && res.result.items.length)
                scope.items = res.result.items;
                // load in between
            });
        };
        /*
          hide snippet
        */
        scope.hide = function() {
          $log.log('::snippets -> hide()');
          scope.status = 'loading';
          __fadeOutTimer = setTimeout(function(){
            scope.items = [];
            scope.sharedItems = [];
            scope.status = 'disabled';
            scope.$apply();
          }, 400);
        };

    

        scope.$watch('target', function(t) {
          $log.log('::snippets @target');
          if(t)
            scope.show(t);
          else
            scope.hide();
        });
      }
    }
  })