/**
 * @ngdoc function
 * @name histograph.controller:ContributeModalCtrl
 * @description
 * # ContributeModalCtrl
 * Modal controller that handle annotation related contribution.
 *
 */
angular.module('histograph')
  /*
    Contribute: add an (entity)-[]-(resource) relationship (sort of tagging)
    Template: cfr. templates/modals/inspect.html
    Resolve: it requires a (resource) object
  */
  .controller('ContributeModalCtrl', function ($scope, $log, $q, $uibModalInstance, type, resource, language, options, SuggestFactory,EntityRelatedExtraFactory) {
    // the list of suggested entities
    $scope.entities   = [];

    $scope.type = type;
    $log.debug('ContributeModalCtrl -> ready()', resource.id, options);

    // initial value for typeahead
    if(options && options.query) {
      $scope.autotypeahead = options.query
      $scope.q = options.query;
    }
    
    $scope.createEntity = function(){
      // pu it invisible...
      $scope.isDisabled = true;
      options.createEntity(resource, "person", {
        query: $scope.query,
        dismiss: function() {
          $scope.cancel();
        },
        submit: function(entity) {
          // add the current saved entity
          $scope.entities = [entity];
          $scope.ok();
        }
      })
    }
    $scope.ok = function () {
      // get the annotation, if any
      var params = {};
      var entities = $scope.entities;
      // if there is a context given in options, there is an annotation somewhere
      if(options && options.context) {
        params.annotation = JSON.stringify({
          context: options.context,
          language: options.language || language,
          ranges: options.annotator? options.annotator.editor.annotation.ranges: options.ranges,
          quote:  options.annotator?  options.annotator.editor.annotation.quote: _.map(entities, 'props.name').join(', ')
        });
      }

      $log.log('ContributeModalCtrl -> ok()', 'saving...');
      // concatenate save queries (async can be tricky for more than 6)
      $q.all(_.map(entities, function (item) {
        return EntityRelatedExtraFactory.save({
          id: item.id,
          related_id: resource.id,
          model: 'resource'
        }, params).$promise;
      })).then(function(results) {
        $log.log('ContributeModalCtrl -> ok()', 'saved', results.length)
        $uibModalInstance.close(_.last(results));
      });
      // [names, naughty,nice])

      // for(var i in entities) {
      //   EntityRelatedExtraFactory.save({
      //     id: entities[i].id,
      //     related_id: resource.id,
      //     model: 'resource'
      //   }, params, function(res) {
      //     $log.log('ContributeModalCtrl -> ok()', 'saved', res)
      //     $uibModalInstance.close(res.result.item);
      //   });
      // }
    };

    $scope.cancel = function () {
      $log.log('ContributeModalCtrl -> cancel()', 'dismissing...');
      $uibModalInstance.dismiss('cancel');
    };

    /*
      typeahead get suggestions function
    */
    $scope.typeaheadSuggest = function(q) {
      $log.log('ContributeModalCtrl -> typeahead()', q, type);
      // suggest only stuff from 2 chars on
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
      })
    }

    $scope.typeaheadSelected = function($item) {
      $scope.entities.push($item);
      $log.log('ContributeModalCtrl -> typeaheadSelected()', $item);
    }
  });