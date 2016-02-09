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

    var availablesteps = {
      person: [
        'viaf',
        'person'
      ]
    }

    $scope.steps = availablesteps[type];
    $scope.step = $scope.steps[0];

    // initial value for typeahead
    if(options && options.query && type =='person') {
      $scope.autotypeahead = options.query
      $scope.q = options.query;
    }

    $scope.ok = function () {
      $log.log('CreateEntityModalCtrl -> ok()', 'saving:', $scope.ghost);
      // @todo save entity, then go back to the previous form;
      // debugger;

    };

    $scope.cancel = function () {
      $log.log('CreateEntityModalCtrl -> cancel()', 'dismissing...');
      $uibModalInstance.dismiss('cancel');
    };

    /*
      suggest viaf!
    */
    $scope.typeaheadSuggestViaf = function(q) {
      $log.log('CreateEntityModalCtrl -> typeahead() VIAF', q, type);
      // suggest only stuff from 2 chars on
      $scope.ghost.viaf = undefined;
      if(q.trim().length < 2) {
        $scope.query = '';
        return;
      }
      
      $scope.query = q.trim();

      return SuggestFactory.getVIAF({
        query: q,
        limit: 10
      }).$promise.then(function(res) {
        if(res.status != 'ok')
          return [];
        return res.result.items
      })
    }

    $scope.typeaheadSelectedViaf = function($item) {
      $scope.ghost.viaf = $item;
      $log.log('CreateEntityModalCtrl -> typeaheadSelectedViaf()', $item);
    }

    $scope.resetViaf = function() {
      $scope.ghost.viaf = undefined;
    }

    $scope.next = function() {

    }
  });
  