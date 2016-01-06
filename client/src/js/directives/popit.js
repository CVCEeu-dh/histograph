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
          Ignore by default every click that has been generated from the popit template
        */
        element.bind('click',function(e){
          e.stopImmediatePropagation();
        })
        /*
          Show gasp instance, with Javascript event
        */
        function toggle(e) {
          var el      = $(e.target),
              type    = el.attr('gasp-type'),
              id      = el.attr('data-id'),
              pos     = el.offset();

          // if there is no type, it is like clicking on stage
          if(!type) { 
            hide();
            return;
          }
          $log.info('::gasp -> toggle() for type:', type, el)
          
          // if id is the same of previous Id, ndo not need to recalculate things
          if(id == _pId) { 
            showGasp(pos);
            return;
          }

          var parent  = el.attr('gasp-parent'),
              tooltip = el.attr('gasp-tip'),
              removable = el.attr('gasp-removable'),
              creator   = el.attr('gasp-creator'),
              upvotes   = el.attr('gasp-upvotes'),
              entity,
              resource;

          // validate id
          if(!id && isNaN(id)) {
            $log.error('::gasp -> toggle() html DOM item lacks "data-id" attribute or it is not a number, given id:', id);
            return;
          }

          // rewrite upvotes
          if(upvotes)
            upvotes = angular.fromJson(upvotes)
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

          scope.entity  = {
            type: type,
            id: id,

          };

          scope.entity.upvotes = upvotes || [];
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
          SuggestFactory.getUnknownNodes({ids:[scope.entity.id]}, function (res) {
            $log.log('::gasp getUnknownNodes:', scope.entity.id)
            scope.entity.isIncomplete = !_.compact([
              res.result.items[0].props.links_wiki,
              res.result.items[0].props.links_viaf
            ]).length;

            scope.entity.props = res.result.items[0].props;
          })
        };
        
        
        
        

        /*
          Position the gasp and show it
        */
        function showGasp(pos) {
          clearTimeout(__timeout);
          // recalculate pos.top and pos.left according to _°_layout
          _gasp.css({
            top: Math.max(300, Math.min(__layout.height - 200, pos.top)),
            left: Math.max(0, Math.min(__layout.width - 400, pos.left))
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
          $log.info(':: gasp -> downvote()', scope.entity);
          $event.stopPropagation();
          scope.$parent.downvote(scope.entity, scope.parent, function (result) {
            scope.entity.upvotes = result.item.rel.upvote;
            scope.feedback();
          });
        }

        scope.upvote = function($event){
          $log.info(':: gasp -> upvote()', scope.entity);
           $event.stopPropagation();
          scope.$parent.upvote(scope.entity, scope.parent, function (result) {
            scope.entity.upvotes = result.item.rel.upvote;
            scope.feedback();
          });
        }

        scope.raiseIssueSelected = function(kind, solution) {
          if(kind == 'type') {
            if(solution != scope.entity.type) {
            // just discard IF IT IS NOT THE CASE
              scope.entity._type = solution;
              scope.question = 'wrongtype-confirm';
            }
          } else if(kind == 'irrelevant') {
            scope.question = 'irrelevant-confirm';
          }
        }

        scope.raiseIssue = function(kind, solution) {
          scope.$parent.raiseIssue(scope.entity, scope.parent, kind, solution, function (err, result) {
            scope.feedback();
          });

        }

        scope.queue = function(){
          $log.info(':: gasp -> queue()', scope.entity)
          scope.$parent.queue(scope.entity.id, true);
        }

        scope.addFilter = function(){
          $log.info(':: gasp -> addFilter()', scope.entity)
          scope.$parent.addFilter('with',scope.entity.id);
        }

        scope.inspect = function(){
          $log.info(':: gasp -> inspect()', scope.entity)
          scope.$parent.inspect(scope.entity.id);
        }
        
        scope.remove = function(){
          $log.info(':: gasp -> remove()', scope.entity);
          scope.$parent.discardvote(scope.entity, scope.parent);
          
          hide();
        }

        scope.merge = function(){
          $log.info(':: gasp -> merge()', scope.entity)
          // merge two entities: add (or upvote the entity) and downvote the current entity
          scope.feedback();
        }

        scope.signale = function($event){
          $log.info(':: gasp -> signale()', scope.entity);
          scope.$parent.signale(scope.entity, scope.feedback);
        }

        scope.typeaheadSuggest = function(q, type) {
          return scope.$parent.typeaheadSuggest(q, type);
        }

        scope.typeaheadSelected = function($item, $model, $label) {
          $log.info(':: gasp -> typeaheadSelected()', arguments);
          if(!$item.id)
            return;
          scope.entity.alias = $item;
          scope.question = 'contribute-confirm';
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

        

        // get the very first window size
        var __layout;
        function calculateLayout() {
          __layout = {
            height: $(window).height(),
            width: $(window).width()
          };
        }
        calculateLayout();

        /* DOM liteners */
        $('body')
          .on('sigma.clickStage', hide)
          .on('click', toggle)
          .on('click', '.obscure', function(e) {
            e.stopImmediatePropagation();
          });
        $(window).on('resize', _.debounce(calculateLayout, 150));

        $log.log(':: gasp init & running, layout:', __layout);
      
      }
    }
  });