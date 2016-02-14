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
  .controller('InspectModalCtrl', function ($scope, $log, $uibModalInstance, entity, relatedFactory, relatedModel, EntityRelatedExtraFactory, SuggestFactory, language, core, socket) {
    $log.debug('InspectModalCtrl ready', entity.result.item, core.user);

    $scope.entity = entity.result.item;

    // @todo wrongtype
    $scope.entity.isWrong = entity.result.item.props.issues && entity.result.item.props.issues.indexOf('wrong') != -1;
    $scope.entity.isIncomplete = !_.compact([entity.result.item.props.links_wiki, entity.result.item.props.links_viaf]).length;
    $scope.isUpvotedByUser = entity.result.item.props.upvote && entity.result.item.props.upvote.indexOf(core.user.username) != -1;
    $scope.isDownvotedByUser = entity.result.item.props.downvote && entity.result.item.props.downvote.indexOf(core.user.username) != -1;

    $scope.limit = 1;
    $scope.offset = 0;
    $scope.modalStatus = 'quiet';
    $scope.language = language;
    
    $scope.isLocked = false;

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
      core.raiseIssue($scope.entity, null, type, solution, function(){
        $scope.isLocked = false;
      });
    }

    $scope.raiseIssueSelected = function(type, solution) {

    }

    /*
      socket linstener

    */
    socket.on('entity:upvote:done', function (result) {
      $log.info('ResourceCtrl socket@entity:upvote:done - by:', result.user);
      if(result.data.id == $scope.entity.id)
        $scope.entity.props.upvote = result.data.props.upvote;
      if(result.user == core.user.username)
        $scope.isUpvotedByUser = true;
    })
    socket.on('entity:downvote:done', function (result) {
      $log.info('ResourceCtrl socket@entity:downvote:done - by:', result.user);
      if(result.data.id == $scope.entity.id)
        $scope.entity.props.upvote = result.data.props.upvote;
      if(result.user == core.user.username)
        $scope.isUpvotedByUser = false;
    })

    socket.on('entity:create-related-issue:done', function (result) {
      if(result.data.questioning.id == $scope.entity.id){
        $scope.entity.props.upvote = result.data.props.upvote;
        $scope.entity.props.downvote = result.data.props.downvote;
      }
      if(result.user == core.user.username)
        $scope.isUpvotedByUser = false;
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