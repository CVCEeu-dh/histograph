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
        showMore: '=', // boolean
        user: '=',        
        'entity': '=', // entity item Cfr. EntityCtrl
      },

      link: function($scope) {

        $log.debug(':: reporter ready - user:', $scope.user.username);
        
        $scope.sync = function(entity) {
          if(!entity || !entity.props)
            return;
          $log.debug(':: reporter sync() -> entity:', $scope.entity.props.name, '- user:', $scope.user.username);
          $scope.setIssues($scope.entity.issues, $scope.entity.props);
        };

        /*
          enrich entity with some stats
          issues: action of hipe issued performed or ciriticized by the user.
          propertes: entity properties (number of issues, upvoters/downvoters per issue whether available)
        */
        $scope.setIssues = function(issues, properties) {
          $scope.entity.isWrong = properties.issues && properties.issues.indexOf('wrong') != -1;
          $scope.entity.isIncomplete = !_.compact([properties.links_wiki, properties.links_viaf]).length;
          $scope.entity.isWrongType = properties.issues && properties.issues.indexOf('type') != -1;


          $scope.isUpvotedByUser = properties.upvote && properties.upvote.indexOf($scope.user.username) != -1;
          $scope.isDownvotedByUser = properties.downvote && properties.downvote.indexOf($scope.user.username) != -1;

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
                  return issue
                });
                
              }).value();

            // $scope.issues = _(issues)
            //   .groupBy('props.target')
            //   .values()
            //   .flatten()
            //   .map(function(issue){
            //     // calculate upvotes and downvotes
            //     var partisans = _.groupBy(issue.users,'rel');
            //     issue.upvotes = (partisans.performs||[]).length;
            //     issue.downvotes = (partisans.criticizes||[]).length;
            //     return issue
            //   })
            //   .groupBy('props.target')
            //   .value();
            console.log($scope.issues)
          };

          if($scope.entity.props.issues) {
            for(var i in $scope.entity.props.issues) {
              var issue = $scope.entity.props.issues[i];
              // does user appear in up-voters
              if(properties['issue_'+ issue +'_upvote']) {
                $scope.entity['issue_' + issue + '_upvoted_by_user' ] = properties['issue_'+ issue +'_upvote'].indexOf($scope.user.username) !== -1;
              }
              // does user appear in down-voters
              if(properties['issue_'+ issue +'_downvote']){
                $scope.entity['issue_' + issue + '_downvoted_by_user' ] = properties['issue_'+ issue +'_downvote'].indexOf($scope.user.username) !== -1;
              }
              // can user remove the issue
              $scope.entity['issue_' + issue + '_removable'] = properties['issue_'+ issue +'_upvote'].join('') ==  $scope.user.username;
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
          $log.log(':: reporter  -~> raiseIssue() type:', type, '- solution:', solution);
          $scope.isLocked = true;
          $scope.cancelQuestion();
          $rootScope.raiseIssue($scope.entity, null, type, solution, function(){
            $scope.isLocked = false;
          });
        };

        /*
          Raise a merge Issue.
        */
        $scope.merge = function(){
          if(!$scope.entity.props.name || isNaN($scope.entity.alias.props.id)){
            $log.log(':: reporter -> merge() unable to merge, no alias has been selected');
            return;
          }
          $scope.isLocked = true;
          $log.log(':: reporter -> merge() -~> raiseIssue() type: merge - entity:', $scope.entity.props.name, '- with:',$scope.entity.alias.props.name);
          // merge two entities: add (or upvote the entity) and downvote the current entity
          $rootScope.raiseIssue($scope.entity, null, 'merge', $scope.entity.alias.props.id, function(){
            $scope.isLocked = false;
          });
        };

        /*
          Disagree with the specific topic.
          If you have already voted this do not apply.
        */
        $scope.downvoteIssue = function(type, solution) {
          $log.log(':: reporter  -~> downvoteIssue() type:', type, '- solution:', solution);
          $scope.isLocked = true;
          $scope.cancelQuestion();
          $rootScope.downvoteIssue($scope.entity, null, type, solution, function() {
            $scope.isLocked = false;
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
          $log.info('InspectModalCtrl socket@entity:upvote:done - by:', result.user);
          if(result.data.id == $scope.entity.id)
            $scope.entity.props.upvote = result.data.props.upvote;
          if(result.user == core.user.username)
            $scope.isUpvotedByUser = true;
        })
        socket.on('entity:downvote:done', function (result) {
          $log.info('InspectModalCtrl socket@entity:downvote:done - by:', result.user);
          if(result.data.id == $scope.entity.id)
            $scope.entity.props.upvote = result.data.props.upvote;
          if(result.user == core.user.username)
            $scope.isUpvotedByUser = false;
        })

        socket.on('entity:create-related-issue:done', function (result) {
          $log.info('InspectModalCtrl socket@entity:create-related-issue:done - by:', result.user, '- result:', result);
          if(result.data.id == $scope.entity.id){
            $scope.entity.props = result.data.props;
            $scope.setIssues(result.data.issues, result.data.props);
          }
        });

        socket.on('entity:remove-related-issue:done', function (result) {
          $log.info('InspectModalCtrl socket@entity:remove-related-issue:done - by:', result.user, '- result:', result);
          if(result.data.id == $scope.entity.id){
            $scope.entity.props = result.data.props;
            $scope.setIssues(result.data.issues, result.data.props);
          }
        });

        /*
          entity loader
        */
        $scope.$watch('entity', $scope.sync);
      }
    }
  });