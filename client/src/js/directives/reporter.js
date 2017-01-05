/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * This directive provide access to inspect questions
 */
angular.module('histograph')
  /*
    usage
    <div reporter language="<$scope.language>language" context="<$scope.item>item"></span>
  */
  .directive('reporter', function($log, $timeout, socket, $rootScope, SuggestFactory) {
    'use strict';

    return {
      restrict : 'EA',
      templateUrl: 'templates/partials/helpers/reporter.html',

      scope: {
        language: '=',
        showEgonetwork: '=', // boolean
        showInNetwork: '=', // boolean
        showMore: '=', // boolean
        user: '=',        
        'entity': '=', // entity item Cfr. EntityCtrl
        'resource': '=' // entity item Cfr. directive/popit
      },

      link: function($scope) {

        $log.debug(':: reporter ready - user:', $scope.user.username);
        
        $scope.sync = function(entity) {
          if(!entity || !entity.props)
            return;
          $log.debug(':: reporter sync() -> entity:', $scope.entity.props.name, '- user:', $scope.user.username);
          $scope.setIssues($scope.entity.issues, $scope.entity);
          $scope.cancelQuestion();
        };

        /*
          enrich entity with some stats
          issues: action of hipe issued performed or ciriticized by the user.
          propertes: entity properties (number of issues, upvoters/downvoters per issue whether available)
        */
        $scope.setIssues = function(issues, entity) {
          $scope.entity.isWrong = entity.props.issues && entity.props.issues.indexOf('wrong') != -1;
          $scope.entity.isIncomplete = !_.compact([entity.props.links_wiki, entity.props.links_viaf, entity.props.last_name]).length;
          $scope.entity.isWrongType = entity.props.issues && entity.props.issues.indexOf('type') != -1;
          $scope.entity.isMergeable = entity.props.issues && entity.props.issues.indexOf('mergeable') != -1;
          $scope.entity.isDownvoted = $scope.entity.downvotes? $scope.entity.downvotes.length > 0: false;
          $scope.entity.isRemoveable = $scope.entity.removable == "true";
          //isDownvoted

          $scope.isUpvotedByUser = entity.props.upvote && entity.props.upvote.indexOf($scope.user.username) != -1;
          $scope.isDownvotedByUser = entity.props.downvote && entity.props.downvote.indexOf($scope.user.username) != -1;

          // calculate upvoters/downvoters for each issue
          if(issues) {
            var _issues = {};
            
            $scope.issues = _(issues)
              .groupBy('props.target')
              .mapValues(function(issues, k){ // for each
                console.log(k)
                // different solutions
                return _.map(issues, function(issue){
                  var partisans = _.groupBy(issue.users,'vote');
                  issue.upvotes = (partisans['1']||[]).length;
                  issue.downvotes = (partisans['-1']||[]).length;
                  issue.score = issue.upvotes - issue.downvotes;
                  return issue
                });
                
              }).value();
          };

          if($scope.entity.props.issues) {
            for(var i in $scope.entity.props.issues) {
              var issue = $scope.entity.props.issues[i];
              // does user appear in up-voters
              if(entity.props['issue_'+ issue +'_upvote']) {
                $scope.entity['issue_' + issue + '_upvoted_by_user' ] = entity.props['issue_'+ issue +'_upvote'].indexOf($scope.user.username) !== -1;
              }
              // does user appear in down-voters
              if(entity.props['issue_'+ issue +'_downvote']){
                $scope.entity['issue_' + issue + '_downvoted_by_user' ] = entity.props['issue_'+ issue +'_downvote'].indexOf($scope.user.username) !== -1;
              }
              // can user remove the issue
              $scope.entity['issue_' + issue + '_removable'] = entity.props['issue_'+ issue +'_upvote'].join('') ==  $scope.user.username;
              // can user vote up or down?
              // $scope.entity['issue_' + issue + '_available'] = !($scope.entity['issue_' + issue + '_downvoted_by_user' ] || $scope.entity['issue_' + issue + '_downvoted_by_user' ]);
            }
          }
        };
        

        $scope.question = undefined;

        /*
          Handle questioning / issues
        */
        $scope.askQuestion = function(question){
          if(question == $scope.question){
            $scope.cancelQuestion();
            return;
          }

          $scope.question = question;
          $scope.enabled = true;
        }

        var timeout;
        $scope.cancelQuestion = function() {
          if(timeout)
            $timeout.cancel(timeout)
          timeout = $timeout(function(){
            $scope.question=undefined;
          }, 500);
          $scope.enabled = false;
        }

        /*
          Select correct type
        */
        $scope.selectReplacement = function(type, solution) {
          if($scope.isLocked)
            return;
          if(type == 'type') {
            if(solution != $scope.entity.type) {
            // just discard IF IT IS NOT THE CASE
              $scope.entity._type = solution;
              $scope.askQuestion('wrongtype-confirm');
            }
          } else if(type == 'irrelevant') {
            $scope.askQuestion('irrelevant-confirm');
          }
        };

        /*
          Raise an issue or agree with a previously created one.
          Cfr. downvote issue for undo.
        */
        $scope.raiseIssue = function(type, solution) {
          if($scope.isLocked)
            return;
          $log.log(':: reporter  -~> raiseIssue() type:', type, '- solution:', solution);
          $scope.isLocked = true;
          $scope.cancelQuestion();
          $rootScope.raiseIssue($scope.entity, null, type, solution, function(){
            $scope.isLocked = false;
            // 
            if(type=='mergeable')
              $scope.downvote();
          });
        };

        /*
          Downvote an entity in a context.
          $scope.resource should be set, cfr. popit directive
        */
        $scope.downvote = function() {
          if($scope.isLocked)
            return;
          $log.log(':: reporter  -~> downvote() entity:', $scope.entity.id, '- resource:', $scope.resource.id);
          if(!($scope.entity.id) || !($scope.resource.id)){
            $log.error(':: reporter  -~> downvote() failed, entity or resource not valid');
            return;
          }
          $scope.isLocked = true;
          $rootScope.downvote($scope.entity, $scope.resource, function(){
            $scope.isLocked = false;
            $scope.cancelQuestion();
          })
        };

        /*
          Upvote an entity in a context.
          $scope.resource should be set, cfr. popit directive
        */
        $scope.upvote = function() {
          if($scope.isLocked)
            return;
          $log.log(':: reporter  -~> upvote() entity:', $scope.entity.id, '- resource:', $scope.resource.id);
          
          if(!($scope.entity.id) || !($scope.resource.id)){
            $log.error(':: reporter  -~> upvote() failed, entity or resource not valid');
            return;
          }
          
          $scope.isLocked = true;
          
          $rootScope.upvote($scope.entity, $scope.resource, function(){
            $scope.isLocked = false;
          })
        };

        /*
          Discard a vote. enabled only if the entity is removeable
          and it has not be upvoted in place.
        */
        $scope.discardvote = function(){
          if($scope.isLocked)
            return;
          $log.info(':: reporter  -~> discardVote() entity:', $scope.entity.id, '- resource:', $scope.resource.id);
          if(!($scope.entity.id) || !($scope.resource.id)){
            $log.error(':: reporter  -~> discardVote() failed, entity or resource not valid');
            return;
          }
          $rootScope.discardvote($scope.entity, $scope.resource, function(){
            $scope.isLocked = false;
            $scope.resource = undefined;
          });
        }

        /*
          Raise a merge Issue.
        */
        $scope.merge = function(){
          if($scope.isLocked)
            return;
          if(!$scope.entity.props.name || !($scope.entity.alias.id)){
            $log.log(':: reporter -> merge() unable to merge, no alias has been selected');
            return;
          }
          $scope.isLocked = true;
          // debugger
          $log.log(':: reporter -> merge() -~> raiseIssue() type: merge - entity:', $scope.entity.props.name, '- with:',$scope.entity.alias.props.name);
          // merge two entities: add (or upvote the entity) and downvote the current entity
          $rootScope.raiseIssue($scope.entity, null, 'mergeable', $scope.entity.alias.id, function(){
            // downvote and upvote
            if(!$scope.resource){
              $scope.isLocked = false;
              $scope.cancelQuestion();
            } else {
              $scope.isLocked = false;
              $scope.mergeInContext($scope.entity, $scope.entity.alias);
            }
          });
        };

        /*
          Merge in context. 
        */
        $scope.mergeInContext = function(entity, entityToMergeWith) {
          if($scope.isLocked)
            return;
          $log.log(':: reporter  -~> mergeInContext() entity:', entity.id, '- resource:', $scope.resource.id, '- MERGE WITH:', entityToMergeWith);
          if(!(entity.id) || !($scope.resource.id)){
            $log.error(':: reporter  -~> mergeInContext() failed, entity or resource not valid');
            return;
          }
          
          $scope.isLocked = true;
          $rootScope.mergeEntities(entity, entityToMergeWith, $scope.resource, function (err, result) {
            $scope.isLocked = false;
            $scope.cancelQuestion();
          });
        };

        /*
          Inspect for a specific
        */
        $scope.inspectIssue = function(issue) {
          if($scope.isLocked)
            return;
          $rootScope.inspect($scope.entity, $scope.resource, issue);
        };

        /*
          Disagree with the specific topic.
          If you have already voted this do not apply.
        */
        $scope.downvoteIssue = function(type, solution) {
          if($scope.isLocked)
            return;
          $log.log(':: reporter  -~> downvoteIssue() type:', type, '- solution:', solution);
          $scope.isLocked = true;
          $scope.cancelQuestion();
          $rootScope.downvoteIssue($scope.entity, null, type, solution, function() {
            $scope.isLocked = false;
            if(type=='mergeable')
              $scope.upvote();
          });
        };

        /*
          typeahead get suggestions function
        */
        $scope.typeaheadSuggest = function(q, type) {
          $log.log(':: reporter -> typeahead()', q, type);
          
          if(q.trim().length < 2) {
            $scope.query = '';
            return;
          }
          
          $scope.query = q.trim();

          return SuggestFactory.get({
            m: type,
            query: q,
            limit: 10
          }).$promise.then(function(res) {
            if(res.status != 'ok')
              return [];
            return res.result.items
          });
        }

        $scope.typeaheadSelected = function($item) {
          // $scope.entities.push($item);
          // $log.log('ContributeModalCtrl -> typeaheadSelected()', $item);
          $log.info(':: reporter -> typeaheadSelected()', arguments);
          if(!$item.id)
            return;
          $scope.entity.alias = $item;
          $scope.askQuestion('contribute-confirm');
        
        };

        /*
          Enable socket listeners
        */
        socket.on('entity:upvote:done', function (result) {
          $log.info(':: reporter socket@entity:upvote:done - by:', result.user);
          if($scope.entity && result.data.id == $scope.entity.id)
            $scope.entity.props.upvote = result.data.props.upvote;
          if($scope.entity && result.user == core.user.username)
            $scope.isUpvotedByUser = true;
        })
        socket.on('entity:downvote:done', function (result) {
          $log.info(':: reporter socket@entity:downvote:done - by:', result.user);
          if($scope.entity && result.data.id == $scope.entity.id)
            $scope.entity.props.upvote = result.data.props.upvote;
          if($scope.entity && result.user == core.user.username)
            $scope.isUpvotedByUser = false;
        })

        socket.on('entity:create-related-issue:done', function (result) {
          $log.info(':: reporter socket@entity:create-related-issue:done - by:', result.user, '- result:', result);
          if($scope.entity && result.data.id == $scope.entity.id){
            $scope.entity.props = result.data.props;
            $scope.setIssues(result.data.issues, result.data);
          }
        });

        socket.on('entity:remove-related-issue:done', function (result) {
          $log.info(':: reporter socket@entity:remove-related-issue:done - by:', result.user, '- result:', result);
          if($scope.entity && result.data.id == $scope.entity.id) {
            $scope.entity.props = result.data.props;
            $scope.setIssues(result.data.issues, result.data);
          }
        });

        socket.on('entity:downvote-related-resource:done', function (result) {
          if($scope.entity && $scope.resource && $scope.resource.id && result.resource.id == $scope.resource.id && result.data.id == $scope.entity.id){
            $log.info(':: reporter socket@entity:downvote-related-resource:done - by:', result.user, '- result:', result);
            $scope.entity.upvotes = result.data.rel.upvote || [];
            $scope.entity.downvotes = result.data.rel.downvote || [];
          }
        });

        socket.on('entity:upvote-related-resource:done', function (result) {
          if($scope.entity && $scope.resource && $scope.resource.id && result.resource.id == $scope.resource.id && result.data.id == $scope.entity.id){
            $log.info(':: reporter socket@entity:upvote-related-resource:done - by:', result.user, '- result:', result);
            $scope.entity.upvotes = result.data.rel.upvote || [];
            $scope.entity.downvotes = result.data.rel.downvote || [];
          }
        });

        socket.on('entity:merge-entity:done', function (result) {
          if($scope.entity && $scope.resource && $scope.resource.id && result.resource.id == $scope.resource.id && result.data.id == $scope.entity.id){
            $log.info(':: reporter entity:merge-entity:done - by:', result.user, '- result:', result);
            $scope.entity.upvotes = result.data.rel.upvote || [];
            $scope.entity.downvotes = result.data.rel.downvote || [];
          }
        });


        /*
          entity loader
        */
        $scope.$watch('entity', $scope.sync);
      }
    }
  });