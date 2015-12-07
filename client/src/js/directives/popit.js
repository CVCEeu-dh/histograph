'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Single popup menu for entities (downvote, comment, etc...)
 * Quietly used by CoreCtrl.
 * This script also contains other minor directives connected with the popping up
 */
angular.module('histograph')
  .directive('disableAutoClose', function() {
    // directive for disabling the default
    // close on 'click' behavior
    return {
      link: function(scope, element) {
        element.on('click', function($event) {
          $event.stopPropagation();
        });
      }
    };
  })
  /*
    Jquery Popup. One popup in DOM to handle every damn entity
  */
  .directive('gasp', function ($log, SuggestFactory) {
    return {
      restrict : 'A',
      scope:{
        target: '=',
        comment: '&comment',
        redirect: '&',
        queue : '&',
        filter: '&',
        inspect: '&'
      },
      templateUrl: 'templates/partials/helpers/popit.html',
      link : function(scope, element, attrs) {
        var _gasp = $(element[0]), // gasp instance;
            _pId  = -1, // previous id
            __delay   = 500,
            __timeout = 0;

        /*
          Show gasp instance, with Javascript event
        */
        function toggle(e) {
          var el      = $(e.target),
              type    = el.attr('gasp-type'),
              id      = el.attr('data-id'),
              pos     = el.offset();

          $log.info('::gasp -> toggle() for type:', type, el)
          // if there is no type, it is like clicking on stage
          if(!type) { 
            hide();
            return;
          }
          // if id is the same of previous Id, ndo not need to recalculate things
          if(id == _pId) { 
            showGasp(pos);
            return;
          }

          var parent  = el.attr('gasp-parent'),
              tooltip = el.attr('gasp-tip'),
              removable = el.attr('gasp-removable'),
              creator   = el.attr('gasp-creator'),
              entity,
              resource;

          // validate id
          if(!id && isNaN(id)) {
            $log.error('::gasp -> toggle() html DOM item lacks "data-id" attribute or it is not a number, given id:', id);
            return;
          }
          // rewrite parent, if is present, as an object
          if(parent) {
            var parent_parts = parent.split('-');
            
            parent  = {
              type: parent_parts[0],
              id:   parent_parts[1] 
            };

            if(!parent.id) {
              $log.error('::gasp -> toggle()  html DOM item lacks "gasp-parent" attribute');
              return;
            }
          }
          // set scope variables
          scope.tooltip = tooltip;
          scope.question = false;

          scope.item  = {
            type: type,
            id: id,

          };

          scope.parent = !parent? null: parent;

          

          scope.link = {
            label: 'go to ' + type + ' page',
            href: '/#/e/' + id,
            creator: creator
          };
          if(removable === 'true')
            scope.link.removable = true;

          $log.log('::gasp -> -> toggle() is removable:', scope.link,removable === 'true')
          // apply scope
          scope.$apply();
          // set the id
          _pId = id;

          // show gasp item
          showGasp(pos);

          // load item
          SuggestFactory.getUnknownNodes({ids:[scope.item.id]}, function (res) {
            $log.log('::gasp getUnknownNodes:', scope.item.id)
            scope.item.props = res.result.items[0].props;
          })
        };
        
        
        
        

        /*
          Position the gasp and show it
        */
        function showGasp(pos) {
          clearTimeout(__timeout);
          _gasp.css({
            top: pos.top,
            left: pos.left
          }).show();
        };

        /*
          Hide
        */
        function hide() {
          _gasp.hide(); 
        }

        function hideDelayed() {
          __timeout = setTimeout(function(){
            hide();
          }, __delay);
        }


        
        /*
          Listener: body.mouseenter
        */
        $('body')
          // .on('click', '[gasp-type]', toggle)
          // .on('mouseenter', '[gasp-type]', toggle)
          // .on('mouseleave', '[gasp-type]', hideDelayed)
          .on('sigma.clickStage', hide)
          .on('click', toggle)
          .on('click', '.obscure', function(e) {
            e.stopImmediatePropagation();
          })
        // element.bind('mouseenter', toggle);
        // element.bind('mouseleave', hideDelayed);

        /*
          Enable parent scope action (do not require a proper '&' in scope)
        */
        scope.downvote = function($event){
          $log.info(':: gasp -> downvote()', scope.item);
          $event.stopPropagation();
          scope.$parent.downvote(scope.item, scope.parent, scope.feedback);
        }

        scope.upvote = function($event){
          $log.info(':: gasp -> upvote()', scope.item);
           $event.stopPropagation();
          scope.$parent.upvote(scope.item, scope.parent, scope.feedback);
        }

        scope.queue = function(){
          $log.info(':: gasp -> queue()', scope.item)
          scope.$parent.queue(scope.item.id, true);
        }

        scope.addFilter = function(){
          $log.info(':: gasp -> addFilter()', scope.item)
          scope.$parent.addFilter('with',scope.item.id);
        }

        scope.inspect = function(){
          $log.info(':: gasp -> inspect()', scope.item)
          scope.$parent.inspect(scope.item.id);
        }
        
        scope.remove = function(){
          $log.info(':: gasp -> remove()', scope.item);
          scope.$parent.discardvote(scope.item, scope.parent);
          
          hide();
        }

        scope.signale = function($event){
          $log.info(':: gasp -> signale()', scope.item);
          scope.$parent.signale(scope.item, scope.feedback);
        }

        /*
          End of the story.
        */
        scope.close = function() {
          scope.question = false;
          hide();
        };

        scope.feedback = function(){
          scope.question = 'feedback'
        }
        /*
          
        */
        scope.askQuestion = function(question, $event) {
          scope.question = question;
          if($event)
            $event.stopPropagation();
        }

        scope.cancelQuestion = function($event) {
          scope.question = false;
          $event.stopPropagation();
        }

        $log.log(':: gasp init');
      }
    }
  });