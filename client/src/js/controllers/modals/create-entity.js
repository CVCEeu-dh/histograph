/**
 * @ngdoc function
 * @name histograph.controller:CreateEntityModalCtrl
 * @description
 * # CreateEntityModalCtrl
 * Modal controller to create a new entity
 *
 */
angular.module('histograph')
  /*
    CreateEntity: create an entity, then add an (entity)-[]-(resource) relationship (sort of tagging)
    Template: cfr. templates/modals/inspect.html
    Resolve: it requires a (resource) object
  */
  .controller('CreateEntityModalCtrl', function ($scope, $log, $q, $uibModalInstance, type, resource, language, options, SuggestFactory,EntityRelatedExtraFactory) {
    $log.debug('CreateEntityModalCtrl -> ready()', resource.id, options);
    $scope.ghost = {};
    $scope.type = type;

    $scope.ok = function () {
      $log.log('CreateEntityModalCtrl -> ok()', 'saving:', $scope.ghost);
      // @todo save entity, then go back to the previous form;
      // debugger;

    };

    $scope.cancel = function () {
      $log.log('CreateEntityModalCtrl -> cancel()', 'dismissing...');
      $uibModalInstance.dismiss('cancel');
    };

  });
  