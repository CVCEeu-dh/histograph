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
  .controller('CreateEntityModalCtrl', function ($scope, $log, $q, $uibModalInstance, type, resource, language, options, SuggestFactory, DbpediaFactory, ResourceRelatedFactory) {
    $log.debug('CreateEntityModalCtrl -> ready()', resource.id, options);
    $scope.ghost = {};
    $scope.type = type;

    var availablesteps = {
      person: [
        {
          name:'dbpedia',
          description: 'create-entity.withdbpedia.desciption',
          init: function(){
            $scope.ghost.dbpedia = undefined
          }
        },
        { 
          name: 'person',
          description: 'create-entity.person.description'
        },
        { 
          name: 'person-dates',
          description: 'create-entity.person.dates'
        },
        
        {
          name: 'viaf',
          description: 'create-entity.withviaf.desciption'
        },
        { 
          name: 'person-more',
          description: 'create-entity.person-more.description'
        },
      ]
    };

    $scope.cursor = 0;

    $scope.steps = availablesteps[type];
    $scope.step = $scope.steps[$scope.cursor];

    // initial value for typeahead
    if(options && options.query && type =='person') {
      $scope.autotypeahead = options.query
      $scope.q = options.query;
    }
    
    $scope.getDataByType = function(type) {
      if(type == 'person') {
        // understand dates (later)
        // remove falsey values
        return _.pick({
          name: _.compact([$scope.ghost.first_name, $scope.ghost.last_name]).join(' '),
          first_name: $scope.ghost.first_name,
          last_name: $scope.ghost.last_name,
          birth_date: $scope.ghost.birth_date,
          death_date: $scope.ghost.death_date,
          description: $scope.ghost.description,
          reference: $scope.ghost.reference,
          links_wiki: $scope.ghost.dbpedia? $scope.ghost.dbpedia.links_wiki: '',
          links_viaf: $scope.ghost.viaf? $scope.ghost.viaf.viafid: ''
        }, _.identity)
      }

      return {};
    }

    $scope.ok = function () {
      $log.log('CreateEntityModalCtrl -> ok()', 'saving:', $scope.ghost);
      // @todo save entity, then go back to the previous form;
      // debugger;
      ResourceRelatedFactory.save({
        id: resource.id,
        model: 'person',
      }, $scope.getDataByType(type), function(res){
        if(res.status=='ok') {
          if(options.submit)
            options.submit(res.result.item);
        }
        $uibModalInstance.close();
      }, function(res){
        // some errors around there
        $scope.setMessage('please check the data you entered')
      })
    };

    $scope.cancel = function () {
      $log.log('CreateEntityModalCtrl -> cancel()', 'dismissing...');
      if(options.dismiss)
        options.dismiss();
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

    /*
      suggest db & viaf!
    */
    $scope.typeaheadSuggestDbpedia = function(q) {
      $log.log('CreateEntityModalCtrl -> typeahead() DBPEDIA', q, type);
      // suggest only stuff from 2 chars on
      $scope.ghost.dbpedia = undefined;
      if(q.trim().length < 2) {
        $scope.query = '';
        return;
      }
      
      $scope.query = q.trim();

      return DbpediaFactory.get({
        MaxHits: 10,
        QueryString: q,
        QueryClass: type == 'person'? 'person': undefined
      }).$promise.then(function(res) {
        return (res.results||[]).map(function(d) {
          if(d.uri)
            d.links_wiki = d.uri.split('/').pop()
          return d;
        })
      })
    }

    $scope.typeaheadSelectedViaf = function($item) {
      $scope.ghost.viaf = $item;
      // format according to the stuffs here
      // var nameparts = $item.term.split(/\s*,\s*/);

      // $scope.ghost.last_name = nameparts[0];
      // $scope.ghost.first_name = nameparts.length > 1? nameparts[1]: '';


      $log.log('CreateEntityModalCtrl -> typeaheadSelectedViaf()', $item);
      $scope.next();
    }

    $scope.typeaheadSelectedDbpedia = function($item) {
      $scope.ghost.dbpedia = $item;
      // format according to the stuffs here
      // $scope.autotypeahead = $item.label;
      // $scope.q = $item.label;

      $log.log('CreateEntityModalCtrl -> typeaheadSelectedDbpedia()', $item);

      $scope.isBusy = true;
      // lock the ui: loading stuffs
      SuggestFactory.getDbpedia({
        link: $item.links_wiki
      }, function(res) {
        if(res.result.item) {
          $scope.ghost = angular.extend({name: $item.label}, $scope.ghost, res.result.item, {description: $item.description});
        }

        $scope.isBusy = false;

        $scope.next();
      })
      
    };

    $scope.resetViaf = function() {
      $scope.ghost.viaf = undefined;
    }

    $scope.next = function() {
      $scope.cursor = Math.min($scope.cursor+1,$scope.steps.length -1);
      $scope.isLastStep = $scope.cursor == $scope.steps.length -1;
      $scope.step = $scope.steps[$scope.cursor];
      
    }
    $scope.previous = function() {
      $scope.cursor = Math.max($scope.cursor-1,0);
      $scope.isLastStep = false;
      $scope.step = $scope.steps[$scope.cursor];
    }
  });
  