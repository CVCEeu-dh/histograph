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
        'use strict';
        $log.log('::lazi-text ready', scope.url);
        
        scope.$watch('url', function(url) {
          if(!url)
            return;
          element.html('loading ...');
          $http.get('/txt/' + scope.url).then(function(res) {
            
            element.html(res.data.replace(/\n/g, '<br/>'));
          });
        })
      }
    }
  })
  /*
    Basic infinite-scroll directive for ui-views
  */
  .directive('infiniteScroll', function($log) {
    'use strict';
    
    return {
      scope: {
        infiniteScroll: '&',
        infiniteScrollCollection: '='
      },
      link: function(scope, elem, attrs) {
        $log.log('::infinite-scroll ready');
        
        var scrollable = angular.element(elem), // wrap elem with jquery.
            distance   = 0.7, // the distance ratio for scrollableHeight
            throttle   = 660, // wait for animtion to set a proper height
            scrollableHeight,
            timer;
        
        // scope vars
        scope.isBusy = false;
        
        // scope fn
        scope.scrolling = function(e){
          if(scope.busy)
            return;
          
          var h = scrollable[0].scrollHeight,
              t = scrollable.scrollTop(),// local scrolltop. we will then add the scrollable height to get the lowest visible point.
              l = h - (scrollableHeight * distance); // the limit
          
          if(t + scrollableHeight > l) {
            $log.log('::infinite-scroll @scrolling', 'launch scroll');
            scope.isBusy = true;
            scope.infiniteScroll();
          } 
        }
        
        
        scope.$watch('infiniteScrollCollection', function(items) {
          if(!items.length) {
            scope.isBusy = false;
            return;
          }
          
          $log.log('::infinite-scroll @infiniteScrollCollection, n.items:', items.length);
          scrollableHeight = scrollable.height();
          if(timer)
            clearTimeout(timer);
          timer= setTimeout(function() {
            scope.isBusy = false;
            scope.$apply();
          }, throttle);
          
        });
        
        // start listening on scrolling events.
        scrollable.on('scroll', scope.scrolling);
      }
    }
  })