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
        center: '=',
        target: '='
        
      },
      link: function(scope, elem){
        $log.log('::snippets ------------');

        var __fadeOutTimer;


        scope.status = 'disabled';
        
        // get language from above (dangersous)
        scope.language = scope.$parent.$parent.language;

        // will contain the target, explained
        scope.items = [];
        // will contain the inbetween items between target4S EDGE nodes
        scope.sharedItems = [];
        // the nature of the shared items
        scope.sharedItemsModel = 'resource';
        // will contain the focused item ids
        scope.itemsIds = [];
        // will contain the total shared Items
        scope.totalItems = 0;
        // limit and offset. reset offset on api param chage.
        scope.limit = 10;
        //
        scope.offset = 0;
        

        /*
          Load a bunch of items
        */
        scope.fill = function(items) {
          $log.log('::snippets -> fill() n. items:',items.length, _.map(items, 'id'));
          // do not remove items at the end of __fadeOutTimer 
          clearTimeout(__fadeOutTimer)
          scope.status = 'enabled'
          scope.items = items;
          
        };



        /*
          load shared items.
          with limits and offsets.
        */
        scope.sync = function() {
          $log.log('::snippets -> sync() getSharedItems between:' , scope.itemsIds);
          $log.debug('::snippets -> sync() center:', scope.center)
          SuggestFactory.getShared(angular.extend({
            ids: scope.itemsIds,
            model: scope.sharedItemsModel
          }, scope.$parent.$parent.params, {
            limit: scope.limit,
            offset: scope.offset
          }), function (res) {
            if(scope.offset > 0)
              scope.sharedItems = scope.sharedItems.concat(res.result.items)
            else {
              scope.sharedItems = res.result.items;
              scope.totalItems  = res.info.total_items;
            }
          })
        };

        /*
          Change offset and sync again, loading the next n items.
        */
        scope.more = function() {
          // new offset
          var offset = scope.offset + scope.limit;
          $log.log('::snippets -> more() new offset:', offset);
          
          if(offset < scope.totalItems) {

            scope.offset = offset;
            scope.sync();
          }
            
        };

        /*
          Show snippet
        */
        scope.show = function(target) {
          $log.log('::snippets -> show() type:', target.type);
          scope.status = 'loading';

          var itemsIdsToLoad = [];
          if(target.type == 'node') {
            if(target.data.node.props) {// if the node has already  been loaded
              scope.fill([target.data.node])
            } else
              itemsIdsToLoad.push(target.data.node.id);

          } else if(target.type == 'edge') {
            var s = target.data.edge.nodes.source,
                t = target.data.edge.nodes.target;

            scope.left = s;
            scope.right =  t;
            scope.offset = 0;
            scope.weight = target.data.edge.weight;

            itemsIdsToLoad.push(s.id, t.id);
            // same type? loaded shared resources
            if(s.type == t.type) {
              scope.itemsIds = itemsIdsToLoad;
              scope.sharedItemsModel = t.type == 'resource'? 'person' : 'resource';
              scope.sync();
            }
          }

          if(itemsIdsToLoad.length > 0) 
            SuggestFactory.getUnknownNodes({
              ids: itemsIdsToLoad
            }, function (res) {
              
              if(res.result && res.result.items.length)
                scope.fill(res.result.items);
                // load in between
            });
        };
        /*
          hide snippet
        */
        scope.hide = function() {
          $log.log('::snippets -> hide()');
          scope.status = 'disabled';
          scope.itemsIds = [];
          // __fadeOutTimer = setTimeout(function(){
          //   scope.items = [];
          //   scope.sharedItems = [];
          //   scope.status = 'disabled';
          //   scope.$apply();
          // }, 400);
        };

        /*
          Add current item to the queue
        */
        scope.queue = function(item) {
          $log.log('::snippets -> addToQueue() id:', item.id || item);
          scope.$parent.addToQueue({
            items: [ item.id || item ]
          });
        }

        /*
          Add current item as filter
        */
        scope.addToFilter = function(item) {
          $log.log('::snippets -> addToFilter() id:', item.id);
          scope.$parent.addFilter({
            key: 'with',
            value: item.id
          });
        };
        
        /*
          display node or edge egonetwork

        */
        scope.egonetwork = function() {
          $log.log('::snippets -> egonetwork()');
          
          var nodes = [];
          if(scope.target.type == 'node')
            nodes.push(scope.target.data.node.id)
          else
            nodes.push(
              scope.target.data.edge.nodes.source.id,
              scope.target.data.edge.nodes.target.id
            );
          scope.$parent.egonetwork(nodes);
        };

        scope.setTarget = function(item) {
          $log.log('::snippets -> setTarget() id:', item.id);
          scope.status = 'targeting'
          // wait for the translation to end, then
          __fadeOutTimer = setTimeout(function() {
            scope.target = {
              type: 'node',
              data: {
                node: item
              }
            };
            scope.$apply();
          }, 400);
        }

        /*
          Listener: scope.center
          ---
          Watch center item changes. Whenever item is selected
        */
        scope.$watch('center', function(v) {
          $log.log('::snippets @center');
          
        });

        /*
          Listener: scope.target
          ---
          Watch target changes
        */
        scope.$watch('target', function(t) {
          $log.log('::snippets @target');
          if(t)
            scope.show(t);
          else
            scope.hide();
        });



        /*
          Listen to api params changes
        */
        scope.$on(EVENTS.API_PARAMS_CHANGED, function(e, params) {
          $log.log('::snippets @EVENTS.API_PARAMS_CHANGED');
          scope.offset = 0;
          if(scope.itemsIds.length)
            scope.sync();
        });

      }
    }
  })