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
  .directive('gmasp', function ($log, $location) {
    return {
      restrict : 'A',
      template: ''+ 
        '<div class="gasp tk-proxima-nova {{enabled?\'enabled\':\'disabled\'}}"><div class="inner {{target.type||\'\'}}">'+ 
          '<span class="text" ng-if="target.type == \'node\'" ><i tooltip="{{type}}" class="fa fa-circle type {{type}}"></i>{{label}}</span>' + 
          '<span class="text" ng-if="target.type == \'edge\'">'+
            '<i class="fa fa-circle {{left.type}}"></i> &#8594; <i class="fa fa-circle {{right.type}}"></i> {{left.label}} &#8594; ' +
            '{{right.label}} </span>' + 
          '<div class="action-group">'+
            '<a class="action slide {{target.type == \'node\'? \'enabled\': \'disabled\'}}" href="{{href}}" title="visit" data-action="link" tooltip="{{linkto}}">'+
              '<span class="fa fa-link"></span></a>'+
            '<a class="action queue" ng-click="addTargetToQueue()" tooltip="add to your current playlist" data-action="queue">'+
              '<span class="fa fa-play-circle-o"></span></a>' +
            
          '</div>' +
        '</div></div>',
      scope:{
        target : '='
      },
      link : function(scope, element, attrs) {
        var _gasp = $(element[0]); // gasp instance;
        scope.enabled = false;
        $log.log('::gmasp ready');
        
        scope.addTargetToQueue = function() {
          $log.log('::gmasp -> addTargetToQueue()')
          if(scope.target.type == 'node')
            scope.$parent.addToQueue({
              items: [ scope.target.data.node.id ]
            });
          else if(scope.target.type == 'edge')
            scope.$parent.addToQueue({
              items: [
                scope.target.data.edge.nodes.source.id,
                scope.target.data.edge.nodes.target.id
              ]
            })
        }
        
        // enable / disable gasp instance
        scope.$watch('target', function(v) {
          $log.log('::gmasp @target - value:', v);
          if(!v || !v.type) {
            // make it NOT visible
            scope.enabled = false;
            return;
          }
          // handle label according to target type (node or edge)
          if(v.type=='node') {
            scope.href  = '#/e/' + v.data.node.id;
            scope.label = v.data.node.label;
            scope.type = v.data.node.type;
          } else if(v.type == 'edge') {
            scope.href  = false;
            scope.left  = v.data.edge.nodes.source;
            scope.right = v.data.edge.nodes.target;
          }
          // make it visible
          scope.enabled = true;
          
        })
      }
    }
  })
  /*
    Jquery Popup.
  */
  .directive('gasp', function ($log) {
    return {
      restrict : 'A',
      scope:{
        target: '=',
        comment: '&comment',
        redirect: '&',
        queue : '&'
      },
      template: '<div class="action-group">'+
                  '<a class="action" href="{{href}}" title="visit" data-action="link" tooltip="{{linkto}}">'+
                    '<span class="fa fa-link"></span></a>'+
                  '<a class="action queue" tooltip="add to your current playlist" data-action="queue">'+
                    '<span class="fa fa-play-circle-o"></span></a>' +
                '</div>',
      link : function(scope, element, attrs) {
        var _gasp = $(element[0]), // gasp instance;
            type,            // element type
            id,              // element id
            parent = {
              type: '',
              id: ''
            },              // target parent id (e.g. 'resource-1232324')
            width = 0,             //target width
            pos   = {              // target center offset relative to the center-middle positon;
              left: 0,
              top: 0
            };
        
        /*
          Show gasp instance
        */
        function show() {
          // build link acording to type.
          $log.log(':: gasp show', type, id, parent.type, parent.id);
          switch(type) {
            case 'date':
              scope.issue  = 'date';
              break;
            case 'person':
            case 'place':
            case 'location':
            case 'personKnown':
              scope.issue  = false;
              scope.href   = '/#/e/' + id;
              scope.linkto = 'go to ' + type + ' page';
              break;
            case 'resource':
            case 'resourceKnown':
              scope.issue  = false;
              scope.href   = '/#/r/'+id;
              scope.linkto = 'go to document page';
              break;
            default:
              scope.issue  = false;
              scope.href   = '';
              scope.linkto = "";
              break;
          }
          
          scope.$apply();
          _gasp.css({
            top: pos.top - 80,
            left: pos.left
          }).show();
        };
        
        function hide() {
          _gasp.hide(); 
        }
        
        $log.log(':: gasp init');
        
        function getGasp() {
          
        }
        /*
          Listener: body.click
        */
        $('body').on('click', function(e) {
          var el    = $(e.target);
          
          type  = el.attr('gasp-type'); // should be something of date, location, person, etc ...
          id    = el.attr('data-id');
          // $log.log(':: gasper @click', type, id);
          if(!type) {
            hide()
          } else {
            if(el.attr('gasp-parent')){
            var parent_parts = el.attr('gasp-parent').split('-');
            parent  = {
              type: parent_parts[0],
              id:   parent_parts[1] 
            };
          }
            pos   = { 
              top: e.clientY ,
              left: e.clientX - 40
            },
            width = el.width();
          
            $log.log(':: gasper @click', el.attr('gasp-type'));
            
            show();
          }
        });
        /*
          Specific listener for sigma event
        */
        $('body').on('sigma.clickNode', function (e, data) {
          $log.info(':: gasper @sigma.clickNode', data);
          
          pos = { 
            top: data.captor.clientY + 65,
            left: data.captor.clientX - 100
          };
          type = data.type;
          id   = data.id;
          show();
        });
        
        $('body').on('sigma.clickStage', function() {
          hide();
        })
        _gasp.find('[data-action=queue]').click(function() {
          if(id)
            scope.queue({
              item: id,
              inprog: true
            });
          else
            $log.error('cannot queue the give item, id is', id);
        })
        // $('body').on('mouseleave', '[gasp-type]', function(e) {
        //   setTimeout(function(){
        //     hide();
        //   }, 2000);
        // })
        //  $('body').on('mouseenter', '[gasp-type]', function(e) {
        //   setTimeout(function(){
        //     hide();
        //   }, 2000);
        // })
        /*
          Listener: element click
        */
      }
    }
  })
  .directive('popit', function($log, $window) {
    return {
      restrict : 'A',
      scope:{
        target: '=',
        comment: '&comment',
        redirect: '&',
        queue : '&'
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
          el.hide();
        }
        
        
        function show() {
          clearTimeout(timer);
          
          el.addClass('disappearing').css({
            top: pos.top + h + 10,
            left: pos.left
          });
          
          // timer = setTimeout(hide, delay);
          
          el.show(); 
        };
        
        var pt;
        // on graph change, change the timeline as well
        scope.$watch('target', function (d) {
          if(!d)
            return;
          if(pt)
            pt.removeClass('selected');
          if(!d.event) {
            hide();
            return;
          }
            
          if(d.event.target) {
            t   = $(d.event.target);
            pos = t.offset();
            h   = t.height();
            w   = t.width();
            pt = t;
            t.addClass('selected');
          } else {
            pos = { 
              top: d.event.clientY ,
              left: d.event.clientX - 80
            };
            h = -60;
            
          }
          
          
          $log.info('::pop @watch ', t , pos, h, w);
          show(); 
        });
        
        // $(document).off('click', makeDisappear);
        // $(document).on('click', makeDisappear);
        // el
        //   .mouseenter(function(){
        //     clearTimeout(timer);
        //   })
        //   .mouseleave(function() {
        //     timer = setTimeout(hide, delay);
        //   })
        /*
          Commenting!
        */
        el.on('click', '[data-action=comment]', function(){
          hide();
          console.log('commenting', scope.target);
          var args = {
                item: scope.target.item,
                tag: scope.target.tag,
                hashtag: scope.target.hashtag
              };
             
          scope.comment(args);
          
        })
        el.on('click', '[data-action=link]', function(){
          hide();
          console.log('link', scope.target);
          var args = {
                item: scope.target.item,
                tag: scope.target.tag,
                hashtag: scope.target.hashtag
              };
          scope.redirect({
            path: '/e/' +  scope.target.tag.id
          })
          
        })
        // add current "tag" item to playlist. availabile only if there is a tag item
        el.on('click', '[data-action=queue]', function(){
          $log.info('::pop -> queue id', scope.target.tag.id);
             
          scope.queue({
            item: scope.target.tag.id,
            inprog: true
          });
          
        })
        
      }
    }
  });