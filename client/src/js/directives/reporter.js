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
  .directive('reporter', function($log, $timeout, socket) {
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
        $log.debug(':: reporter ready, entity:', $scope.entity.props.name, '- user:', $scope.user.username);
        
        /*
          enrich entity with some stats
        */
        $scope.setIssues = function(properties) {
          $scope.entity.isWrong = properties.issues && properties.issues.indexOf('wrong') != -1;
          $scope.entity.isIncomplete = !_.compact([properties.links_wiki, properties.links_viaf]).length;
          $scope.isUpvotedByUser = properties.upvote && properties.upvote.indexOf($scope.user.username) != -1;
          $scope.isDownvotedByUser = properties.downvote && properties.downvote.indexOf($scope.user.username) != -1;
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
        $scope.setIssues($scope.entity.props);

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
          Raise an issue or agree with a previously created one.
          Cfr. downvote issue for undo.
        */
        $scope.raiseIssue = function(type, solution) {
          $log.log(':: reporter  -~> raiseIssue() type:', type, '- solution:', solution);
          $scope.isLocked = true;
          $scope.cancelQuestion();
          $scope.$parent.raiseIssue($scope.entity, null, type, solution, function(){
            $scope.isLocked = false;
          });
        };

        /*
          Disagree with the specific topic.
          If you have already voted this do not apply.
        */
        $scope.downvoteIssue = function(type, solution) {
          $log.log('InspectModalCtrl  -~> downvoteIssue() type:', type, '- solution:', solution);
          $scope.isLocked = true;
          $scope.cancelQuestion();
          $scope.$parent.downvoteIssue($scope.entity, null, type, solution, function() {
            $scope.isLocked = false;
          });
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
            $scope.setIssues(result.data.props);
          }
        });

        socket.on('entity:remove-related-issue:done', function (result) {
          $log.info('InspectModalCtrl socket@entity:remove-related-issue:done - by:', result.user, '- result:', result);
          if(result.data.id == $scope.entity.id){
            $scope.entity.props = result.data.props;
            $scope.setIssues(result.data.props);
          }
        });
      }
    }
  });