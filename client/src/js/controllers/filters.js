/**
 * @ngdoc function
 * @name histograph.controller:FiltersCtrl
 * @description
 * # FiltersCtrl
 * Intermediate controller (below CoreCtrl, but above views controllers) for filtering purposes
 * it was written in order to simplify CoreCtrl debugging
 */
angular.module('histograph')
  .controller('FiltersCtrl', function ($scope, $log, $location, EVENTS) {
    $log.debug('FiltersCtrl ready', $location.search());
    
    $scope.filters = {};
    $scope.facets = {}; // available facets, per filter key
    
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
        return (d != value)
      })
      
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
        
        var list = _.compact(_.map(angular.copy($scope.filters[key]), _.trim));
        if(list.indexOf(value) === -1) {
          list.push(value);
          $location.search(key, list.join(','));
        }
      }
    }
    
    $scope.setFilter = function(key, value) {
      $location.search(key, value);
    }
    
    /*
      Filling filters and transform them
    */
    $scope.loadFilters = function() {
      var candidates = $location.search(),
          filters =  {}
      // handle 'type' and mimetype (pseudo-array)
      for (var i in candidates) {
        var list = _.compact(_.map(candidates[i].split(','), _.trim));
        filters[i] = list;
      }
      
      $log.debug('FiltersCtrl -> sync()', filters);
      $scope.filters = filters;
      $scope.isFiltered = !_.isEmpty($scope.filters);
    }
    
    $scope.$on('$locationChangeSuccess', $scope.loadFilters);
  })