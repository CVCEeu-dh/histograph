'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Single popup menu for entities (downvote, comment, etc...)
 * Quietly used by CoreCtrl.
 */
angular.module('histograph')
  .directive('popit', function($log, $window) {
    return {
      restrict : 'A',
      scope:{
        target: '='
      },
      link : function(scope, element, attrs) {
        var el = $(element[0]),
            timer,
            delay= 1500,
            t,
            pos,
            h,
            w;
            
        
        $log.info('::pop');
        
        
        // make the tooltip disappear if clicked on other pop
        function hide() {
          //el.hide();
        }
        
        
        function show() {
          clearTimeout(timer);
          timer = setTimeout(hide, delay);
          
          el.css({
            top: pos.top + h,
            left: pos.left
          });
          
          el.show(); 
        };
        
        
        // on graph change, change the timeline as well
        scope.$watch('target', function (d) {
          if(!d)
            return;
          
          t   = $(d.event.target);
          pos = t.offset();
          h   = t.height();
          w   = t.width();
          
          $log.info('::pop knockover', t , pos, h, w);
          show(); 
        });
        
        // $(document).off('click', makeDisappear);
        // $(document).on('click', makeDisappear);
        el
          .mouseenter(function(){
            clearTimeout(timer);
          })
          .mouseleave(function() {
            timer = setTimeout(hide, delay);
          })
        
      }
    }
  });