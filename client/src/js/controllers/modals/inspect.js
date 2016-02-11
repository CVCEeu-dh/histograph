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
  .controller('InspectModalCtrl', function ($scope, $log, $uibModalInstance, entity, relatedFactory, relatedModel, EntityRelatedExtraFactory, SuggestFactory, language ) {
    $scope.entity = entity.result.item;
    $scope.limit = 1;
    $scope.offset = 0;
    $scope.modalStatus = 'quiet';
    $scope.language = language;
    

    $scope.ok = function () {
      $uibModalInstance.close();
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

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
      if($scope.items.length == 1) {
        relatedFactory.get({
          id: $scope.items[0].id,
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

    $scope.sync();

    // if the item has not viaf_id or wiki_id IDENTIFIER attached, propose a set of probable entities. The user will then choose.
    for(var i=0, l=$scope.items.length; i < l; i++)
      if(_.isEmpty($scope.items[i].props.links_viaf) || _.isEmpty($scope.items[i].props.links_wiki)){
        $scope.chooseVIAF = true;
        SuggestFactory.getVIAF({
          query: $scope.items[i].props.name
        }, function(res) {
          $scope.items[i].viafItems = _.map(_.values(_.groupBy(res.result.items, 'viafid')), function(d){
            return _.first(d)
          });
        })
        break; // only the first item
      }
  })