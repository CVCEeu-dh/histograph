/**
 * @ngdoc function
 * @name histograph.controller:InspectModalCtrl
 * @description
 * # InspectModalCtrl
 * Modal controller to inspect an entity (person, location etc. powered with crowdsourcing).
 * Cfr in CoreCtrl funciton $scope.inspect();
 *
 */
angular.module('histograph')
  .controller('InspectModalCtrl', function ($scope, $log, $uibModalInstance, entity, relatedFactory, relatedModel, EntityRelatedExtraFactory, SuggestFactory, language, user, core, socket) {
    $log.debug('InspectModalCtrl ready', entity.result.item, core.user);

    $scope.entity = entity.result.item;
    $scope.user = user;
    // @todo wrongtype
    $scope.setIssues = function(properties) {
      $scope.entity.isWrong = properties.issues && properties.issues.indexOf('wrong') != -1;
      $scope.entity.isIncomplete = !_.compact([properties.links_wiki, properties.links_viaf]).length;
      $scope.isUpvotedByUser = properties.upvote && properties.upvote.indexOf(core.user.username) != -1;
      $scope.isDownvotedByUser = properties.downvote && entity.result.item.props.downvote.indexOf(core.user.username) != -1;
    }

    $scope.setIssues(entity.result.item.props);

    $scope.limit = 1;
    $scope.offset = 0;
    $scope.modalStatus = 'quiet';
    $scope.language = language;
    
    $scope.isLocked = false;

    $scope.queue = function(item) {
      $log.log('InspectModalCtrl  -~> queue()', item);
      core.queue(item.id? item : $scope.entity, true);
    };

    $scope.favourite = function(item) {
      $scope.isLocked = true;
      core.favourite(item, function(){
        $scope.isLocked = false;
      });
    };

    $scope.unfavourite = function(item) {
      $scope.isLocked = true;
      core.unfavourite(item, function(){
        $scope.isLocked = false;
      });
    };

    $scope.ok = function () {
      $uibModalInstance.close();
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };


    $scope.askQuestion = function(question){
      $scope.question = question;
    }

    $scope.cancelQuestion = function() {
      $scope.question = undefined;
    }

    $scope.confirm = function() {
      $log.log('InspectModalCtrl  -~> confirm()');
      $scope.isLocked = true;
      core.confirm($scope.entity, function(){
        $scope.isLocked = false;
      });
    };

    $scope.unconfirm = function() {
      $log.log('InspectModalCtrl  -~> unconfirm()');
      $scope.isLocked = true;
      core.unconfirm($scope.entity, function(){
        $scope.isLocked = false;
      });
    };

    $scope.raiseIssue = function(type, solution) {
      $log.log('InspectModalCtrl  -~> raiseIssue() type:', type, '- solution:', solution);
      $scope.isLocked = true;
      $scope.cancelQuestion();
      core.raiseIssue($scope.entity, null, type, solution, function(){
        $scope.isLocked = false;
      });
    };

    $scope.raiseIssueSelected = function(type, solution) {

    };
    /*
      Disagree with the specific topic.
      If you have already voted this do not apply.
    */
    $scope.downvoteIssue = function(type, solution) {
      $log.log('InspectModalCtrl  -~> downvoteIssue() type:', type, '- solution:', solution);
      $scope.isLocked = true;
      $scope.cancelQuestion();
      core.downvoteIssue($scope.entity, null, type, solution, function() {
        $scope.isLocked = false;
      });
    };

    /*
      socket linstener

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

    

    $scope.upvote = function(resource) {
      $scope.modalStatus = 'voting';
      
      EntityRelatedExtraFactory.save({
        id: $scope.entity.id,
        model: relatedModel,
        related_id: resource.id,
        extra: 'upvote'
      }, {}, function (res) {
        $log.log('InspectModalCtrl -> upvote()', res.status);
        $scope.modalStatus = 'voted';
      });
    }

    $scope.downvote = function () {
      $scope.modalStatus = 'voting';
      EntityRelatedExtraFactory.save({
        id: $scope.items[0].id,
        model: relatedModel,
        related_id: $scope.relatedItems[0].id,
        extra: 'downvote'
      }, {}, function (res) {
        $log.log('InspectModalCtrl -> downvote()', res.status);
        $scope.modalStatus = 'voted';
      });
    }

    $scope.next = function() {
      $scope.modalStatus = 'quiet';
      $scope.offset = Math.min($scope.totalItems -1, $scope.offset + 1);
      $scope.sync();
    };

    $scope.previous = function() {
      $scope.offset = Math.max($scope.offset -1, 0);
      $scope.sync();
    };

    $scope.sync = function(){
      $scope.modalStatus = 'loading';
      if($scope.entity.id) {
        relatedFactory.get({
          id: $scope.entity.id,
          model: relatedModel,
          limit: $scope.limit,
          offset: $scope.offset
        }, function (res) {
          $scope.modalStatus = 'quiet';
          $scope.relatedItems = res.result.items;
          $scope.totalItems = res.info.total_items;
        });
      }
    };
    // start everthing
    $scope.sync();

  })