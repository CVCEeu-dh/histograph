/**
 * @ngdoc function
 * @name histograph.controller:FiltersCtrl
 * @description
 * # FiltersCtrl
 * Intermediate controller (below CoreCtrl, but above views controllers) for filtering purposes
 * it was written in order to simplify CoreCtrl debugging
 */
angular.module('histograph')
  .controller('FiltersCtrl', function ($scope, $log, $location, SuggestFactory,EVENTS) {
    $log.debug('FiltersCtrl ready', $location.search());
    
    $scope.filters = {};
    $scope.filterItems  = {};
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
        
        var list = _.compact(_.map(angular.copy($scope.filters[key]), _.trim));
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
          }).then(function (res) {
            $scope.filterItems[key] = res.data.result.items;
          })
      });   
    };
    
    /*
      Filling filters and transform them
    */
    $scope.loadFilters = function() {
      var candidates = $location.search(),
          filters =  {}
      // handle 'type' and mimetype (pseudo-array)
      for (var i in candidates) {
        var list = _.unique(_.compact(_.map((''+candidates[i]).split(','), _.trim)));
        filters[i] = list;
      }
      
      $log.debug('FiltersCtrl -> sync()', filters);
      $scope.filters = filters;
      $scope.isFiltered = !_.isEmpty($scope.filters);
      $scope.loadFiltersItems();
    }
    
    
    /*
      The combinatio of choices.
      load facets?
    */
    $scope.grammar = {
      explore: {
        name: 'explore',
        subjects: [
          {
            name: 'documents',
            link: '/r',
            connector: {
              type: 'of type',
              relatedTo: 'which contains',
              from: 'from',
              to: 'to'
            },
            types: [
              {
                name: 'any kind of documents',
              },
              {
                name: 'mostly pictures',
                filter: 'type=picture'
              },
              {
                name: 'letters',
                filter: 'type=letter'
              },
              {
                name: 'treaty',
                filter: 'type=treaty'
              }
            ],
            relatedTo: {
              autosuggest: 'entity'
            }
          },
          {
            name: 'people',
            link: '/e',
            connector: {
              type: 'in documents of type'
            },
            types: [
              {
                name: 'in any kind of documents',
              },
              {
                name: 'in pictures',
                filter: 'type=picture'
              },
              {
                name: 'in letters',
                filter: 'type=letter'
              },
              {
                name: 'in treaty',
                filter: 'type=treaty'
              }
            ],
            relatedTo: [
              {
                name: 'wherever'
              }
            ]
          },
          {
            name: 'organizations',
            connector: {
              type: 'in documents of type'
            },
            types: [
              {
                name: 'in any kind of documents',
              },
              {
                name: 'in pictures',
              },
              {
                name: 'in letters',
              },
              {
                name: 'in treaty'
              }
            ],
            relatedTo: [
              {
                name: 'every'
              }
            ]
          },
        ],
        
      },
      connect: {
        name: 'find',
        subjects: [
          {
            name: 'all kind of documents' 
          },
        ],
        relatedTo: [ // aka collecting between
          {
            name: 'documents'
          },
          {
            name: 'people'
          },
          {
            name: 'organizations' 
          },
        ],
        from: [
          {
            name: 'from the beginning of time' 
          }
        ],
        to: [
          {
            name: 'to the end of time' 
          }
        ]
      },
      search: {
        name: 'search',
        subjects: [
          {
            name: 'documents' 
          },
          {
            name: 'people' 
          },
          {
            name: 'organizations' 
          },
        ]
      },
    };
    
    $scope.grammar.explore.subject = $scope.grammar.explore.subjects[0];
    
    $scope.setSubject = function(grammar, subject) {
      grammar.subject = subject
    }
    $scope.setType = function(subject, type) {
      subject.type = type;
      if(type.filter)
        $scope.addFilter(type.filter.split('=')[0],type.filter.split('=')[1])
      else
        $scope.removeFilter('type')
    }
    $scope.$on('$locationChangeSuccess', $scope.loadFilters);
  })