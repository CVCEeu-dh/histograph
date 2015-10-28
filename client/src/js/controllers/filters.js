/**
 * @ngdoc function
 * @name histograph.controller:FiltersCtrl
 * @description
 * # FiltersCtrl
 * Intermediate controller (below CoreCtrl, but above views controllers) for filtering purposes
 * it was written in order to simplify CoreCtrl debugging
 */
angular.module('histograph')
  .controller('FiltersCtrl', function ($scope, $log, $http, $location, SuggestFactory,EVENTS) {
    $log.debug('FiltersCtrl ready, filters active:', $location.search());
    
    $scope.filters = {};
    $scope.filterItems  = {};
    $scope.facets = {}; // available facets, per filter key
    $scope.qs = ''; // the location.search() object as querystring
    /*
      e.g.
      setFacets('type', [
        {
          name:'picture', count: 12
        },
        {
          name:'picture', count: 12
        }  
      ])
    */
    $scope.setFacets = function(key, values) {
      $scope.facets[key] = values;
    }
    
    
    
    /*
      Filters function for templates
    */
    $scope.removeFilter = function(key, value) {
      $log.log('FiltersCtrl -> removeFilter() - key:', key, '- value:', value)
      var aliveFilters = _.filter(angular.copy($scope.filters[key]), function (d) {
        return value && (d != value)
      })
      
      if(key == 'with') {
        var index = _.map($scope.filterItems.with, 'id').indexOf(value);
        $scope.filterItems.with.splice(index, 1);    
      }
         
        
      if(aliveFilters.length == 0)
        $location.search(key, null);
      else
        $location.search(key, aliveFilters.join(','));
    }
    
    /*
      Add filter and take care of putting the right args in location.search object.
    */
    $scope.addFilter = function(key, value) {
      if(!$scope.filters[key])
        $location.search(key, value);
      else {
        $log.log('FiltersCtrl -> addFilter() - key:', key, '- value:', value)
        
        var list = _.unique(_.compact(_.map(angular.copy($scope.filters[key]), _.trim)));
        if(list.indexOf(value) === -1) {
          list.push(value);
          $location.search(key, list.join(','));
        }
      }
      $scope.loadFiltersItems()
      
    }
    
    $scope.setFilter = function(key, value) {
      $location.search(key, value);
    }

    
    /*
      For some field, load complex items (e.g; location, persons etc..);
      Ids can be resoruce or other.
    */
    $scope.loadFiltersItems = function() {
      // collect ids
      _.each(angular.copy($scope.filters), function (d, key) {
        if(key == 'with')
          SuggestFactory.getUnknownNodes({
            ids: d
          }, function (res) {
            $scope.filterItems[key] = res.result.items;
          })
      });   
    };
    
    /*
      Filling filters and transform them
    */
    $scope.loadFilters = function() {
      var candidates = $location.search(),
          filters =  {},
          qs = [];
      // handle 'type' and mimetype (pseudo-array)
      for (var i in candidates) {
        var list = _.unique(_.compact(_.map((''+candidates[i]).split(','), _.trim)));
        filters[i] = list;
        qs.push(encodeURIComponent(i) + '=' +encodeURIComponent(candidates[i]));
      }
      // set query for search ctrl
      if(filters['query'])
        $scope.query = filters['query'].join('');
      $log.debug('FiltersCtrl -> loadFilters()', filters);
      $scope.filters = filters;
      $scope.isFiltered = !_.isEmpty($scope.filters);
      $scope.qs = qs.join('&');
      $scope.loadFiltersItems();
      
    }
    
    /*
      typeahead, with filters.
    */
    $scope.typeaheadSuggest = function(q, type) {
      $log.log('FiltersCtrl -> typeahead()', q, type);
      // suggest only stuff from 2 chars on
      if(q.trim().length < 2)
        return;
      
      return SuggestFactory.get({
        m: type,
        query: q,
        limit: 10
      }).$promise.then(function(res){
        if(res.status != 'ok')
          return [];
        return [{type: 'default'}].concat(res.result.items)
      })
    }
    /*
      The combinatio of choices.
      load facets?
    */
    $scope.grammar;
    
    /*
      Set a choiche from the choices provided by the ruler
      (i.e. the root grammar)
    */
    $scope.setChoice = function(choice) {
      var path = $scope.getState().href(choice.name).replace(/^#/,'').replace('%20', ' ');
      $log.log('FilterCtrl -> setChoice', choice.name, '- path:', path );
      
      $location.path(path).search($location.search())
    }
    
    // set from the currentState
    
    
    $scope.setType = function(subject, type) {
      subject.type = type;
      if(type.filter)
        $scope.addFilter(type.filter.split('=')[0],type.filter.split('=')[1])
      else
        $scope.removeFilter('type')
    }
    
    $scope.$on('$locationChangeSuccess', $scope.loadFilters);
    
    /*
      Watch for currentState changes in ui.router.
      Cfr StateChangeSuccess listener in core.js
    */
    $scope.$watch('currentState', function(state) {
      if(!state)
        return;
      $log.log('FiltersCtrl @currentState', state);
      var $state = $scope.getState(),
          parentState = $state.get(state.name.split('.')[0]);
      
      // set (or unset) search query if any
      $scope.query = $state.params.query;
        
      
      // ruler is the parentstate grammar
      if(parentState && parentState.abstract) {
        $scope.ruler = parentState.grammar;
      }
      
      if(state.grammar)
        $scope.grammar = state.grammar
    
     })
  })