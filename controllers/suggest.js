/**
 * Suggest controller for autocompletion and search purposes
 * =====================================
 *
 */
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    models     = require('../helpers/models'),
    
    parser     = require('../parser.js'),
    
    neo4j      = require('seraph')(settings.neo4j.host),
    validator  = require('../validator'),
        
    queries    = require('decypher')('./queries/suggest.cyp'),
    
    async      = require('async'),
    _          = require('lodash');


/*
  Very basic tiny method to tranform words in a valid lucenequery
  according to ccurrent lucene indexes.
*/
function toLucene(query) {
  if(query.split(/\s/).length > 1)
    return '"' +query.split(/\s/).join(' ')+ '"'
  else
    return '*'+query+'*';
  
  var q = '*' + query.split(/[^\w]/).map(function (d) {
    return d.trim().toLowerCase()
  }).join('*') + '*';
  return q;
  
}
/*
  Tiny helper to tranform words in a valid neo4j regexp
*/
function toRegexp(query) {
  var q = '(?i).*' + query.split(/[^\w]/).map(function (d) {
    return d.trim().toLowerCase()
  }).join('.*') + '.*';
  return q;
}

/*
  Transform a comma separated list of id candidate in a javascript array of Integer IDS
*/
function toIds(ids) {
  return ids.split(',').filter(function (d) {
    return !isNaN(d)
  }).map(function (d) {
    return +d;
  });
}

module.exports =  function(io){
  return {
    /*
      Return a list of possible paths connecting at least two nodes of the given set.
      api/suggest/allinbetween
    */
    allInBetween: function(req, res) {
      var ids = toIds(req.params.ids);
      if(!ids.length)
        return res.error(400, {ids: 'not valid list of id'})
      
      var form = validator.request(req, {
            limit: 20,
            offset: 0
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      models.getMany({
        queries: {
          count_items: queries.count_all_in_between,
          items: queries.all_in_between,
        },
        params: {
          ids: ids,
          limit: form.params.limit,
          offset: form.params.offset
        }
      }, function (err, results) {
        // ids of all the discovered.
        var discovered = _.unique(_.flatten(results.count_items, true), 'id');
      
        if(err)
          return helpers.cypherQueryError(err, res);
        
        var graph = {
          nodes: {},
          edges: {}
        };
        
        for(var i = 0; i < results.items.length; i++) {
          for(var j = 0; j < results.items[i].paths.length; j++) {
            if(!graph.nodes[results.items[i].paths[j].id]) {
              graph.nodes[results.items[i].paths[j].id] = results.items[i].paths[j];
            }
          }
          for(var j = 0; j < results.items[i].rels.length; j++) {
            var edgeId = _.sortBy([results.items[i].rels[j].start, results.items[i].rels[j].end]).join('.');
            
            if(!graph.edges[edgeId]) {
              graph.edges[edgeId] = {
                id: edgeId,
                source: results.items[i].rels[j].start,
                target: results.items[i].rels[j].end,
                weight: 0
              };
            }
            graph.edges[edgeId].weight++;
          }
        }
        
        return res.ok({
          graph: {
            nodes: _.values(graph.nodes),
            edges: _.values(graph.edges)
          }
        }, {
          total_items: discovered.length,
          clusters: _.mapValues(_.groupBy(discovered, 'type'),_.size),
          params: {
            offset: form.params.offset,
            limit: form.params.limit,
            ids: ids
          }
        });
        
      })
      
      
      // neo4j.query(queries.all_in_between, {
      //   ids: ids,
      //   offset: form.params.offset,
      //   limit: form.params.limit
      // }, function (err, items) {
      //   if(err)
      //     return helpers.cypherQueryError(err, res);
      //   // console.log(items);
      //   var graph = {
      //     nodes: {},
      //     edges: {}
      //   };
        
      //   for(var i = 0; i < items.length; i++) {
      //     for(var j = 0; j < items[i].paths.length; j++) {
      //       if(!graph.nodes[items[i].paths[j].id]) {
      //         graph.nodes[items[i].paths[j].id] = items[i].paths[j];
      //       }
      //     }
      //     for(var j = 0; j < items[i].rels.length; j++) {
      //       var edgeId = _.sortBy([items[i].rels[j].start, items[i].rels[j].end]).join('.');
            
      //       if(!graph.edges[edgeId]) {
      //         graph.edges[edgeId] = {
      //           id: edgeId,
      //           source: items[i].rels[j].start,
      //           target: items[i].rels[j].end,
      //           weight: 0
      //         };
      //       }
      //       graph.edges[edgeId].weight++;
      //     }
      //   }
        
      //   return res.ok({
      //     graph: {
      //       nodes: _.values(graph.nodes),
      //       edges: _.values(graph.edges)
      //     }
      //   }, {
      //     params: {
      //       offset: form.params.offset,
      //       limit: form.params.limit,
      //       ids: ids
      //     }
      //   });
      // })
    },
    /*
      Return a list of possible path connecting all of the comma separated nodes given
      api/suggest/
    */
    allShortestPaths: function(req, res) {
      var ids = toIds(req.params.ids);
      
      if(!ids.length)
        return res.error({})
      
      var offset = +req.query.offset || 0,
          limit  = +req.query.limit || 20;
      
      neo4j.query(queries.all_shortest_paths, {
        ids: ids,
        threshold: ids.length,
        labels: ['person','resource','place'],
        offset: offset,
        limit: limit
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);

        return res.ok({
          items: items.map(function (d) {
            d.path = _.values(d.path)
            return d;
          })
        }, {
          ids: ids,
          offset: offset,
          limit: limit
        });
      })
    },
    
    getSharedResources: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      models.getMany({
        queries: {
          count_items: queries.count_shared_resources,
          items: queries.get_shared_resources
        },
        params: form.params
      }, function (err, results) {
        helpers.models.getMany(err, res, results.items, results.count_items, form.params);
      })
    },
    
    /**
      
    */
    getUnknownNode: function (req, res) {
      neo4j.query(queries.get_unknown_node, {
        id: +req.params.id
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          item: _.first(items)
        });
      })
    },
    
    getUnknownNodes: function (req, res) {
      var ids = toIds(req.params.ids);
      if(!ids.length)
        return res.error({})
      
      neo4j.query(queries.get_unknown_nodes, {
        ids: ids
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items
        }, {
          ids: ids
        });
      })
    },
    
    /*
    */
    getNeighbors: function (req, res) {
      var ids = toIds(req.params.ids);
      
      if(!ids.length)
        return res.error({})
      neo4j.query(queries.get_neighbors, {
        ids: ids,
        labels: ['person', 'place', 'location', 'resource', 'collection'],
        limit: 1000
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items
        }, {
          ids: ids
        });
      })
    },
    
     /**
      search the query among:resources and entities. Return a list of objects, max. 3 per 'entities and 5 for resources.
      Norammly if the user clicks on "submit free search" he will be sent to search page wich will display top search results.
      carefully divided by
      next(err=null, [])
     */
    suggest: function(req, res) {
      var resource_query,
          entity_query;
          
      var form = validator.request(req, {
            limit: 20,
            offset: 0,
            language: 'en'
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      resource_query = 'full_search:' + toLucene(req.query.query) + ' OR title_search:' + toLucene(req.query.query);
      entity_query = 'name_search:' + toLucene(req.query.query);
      // lucene.setSearchTerm('full_search:(' + req.query.query + ') OR title_search:(' + req.query.query+')');
      // resource_query = '' + lucene.getFormattedSearchTerm();
      
      // lucene.setSearchTerm('name_search:' + req.query.query);
      // entity_query = '' + lucene.getFormattedSearchTerm();
      console.log('resource_query', resource_query)
          console.log('entity_query', entity_query)
      
      neo4j.query(queries.lucene_query, {
        resource_query: resource_query,
        entity_query: entity_query,
        limit: req.query.limit || 4,
        language: form.params.language
      }, function (err, items) {
        if (err) {
          
        }
        if(err)
          return helpers.cypherQueryError(err, res);
        
        return res.ok({
          
          items: items.map(function (d) {
            d.props.languages = _.values(d.props.languages)
            return d;
          })
        });
      })
    },
    
    /*
      Caption and title multilanguage search.
      @todo: use the solr endpoint wherever available.
    */
    resources: function (req, res) {
      var Resource = require('../models/resource');
      var offset = +req.query.offset || 0,
          limit  = +req.query.limit || 20,
          q      = toLucene(req.query.query),
          query  = [
              'full_search:', q
            ].join('');
      
      // get countabilly
      async.parallel({
        get_matching_resources_count: function (callback) {
          neo4j.query(queries.get_matching_resources_count, {
            query: query,
          }, function (err, items) {
            if(err)
              callback(err);
            else
              callback(null, items);
          })
        },
        get_matching_resources: function (callback) {
          neo4j.query(queries.get_matching_resources, {
            query: query,
            offset: offset,
            limit: limit
          }, function (err, items) {
            if(err) {
              console.log(err)
              callback(err);
            } else
              callback(null, items);
          })
        }
      }, function (err, results) {
        if(err)
          return helpers.cypherQueryError(err, res);
        
        return res.ok({
          items: results.get_matching_resources.map(Resource.normalize),
        }, {
          total_count: results.get_matching_resources_count.total_count,
          offset: offset,
          limit: limit
        });
      });
    },
    
    /*
      Lucene results. can also be used for typeahead, since it is very fast.
    */
    getEntities: function (req, res) {
      var form = validator.request(req, {
            limit: 20,
            offset: 0,
            entity: 'person'
          }, {
            fields: [
              validator.SPECIALS.entity
            ]
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      var q = 'name_search:' + toLucene(req.query.query);
      form.params.query = q;
      
      models.getMany({
        queries: {
          count_items: queries.get_matching_entities_count,
          items: queries.get_matching_entities
        },
        params: form.params
      }, function (err, results) {
        console.log(err)
        helpers.models.getMany(err, res, results.items, results.count_items, form.params);
      });
    },
    
    getGraph: function (req, res) {
      var offset = +req.query.offset || 0,
          limit  = +req.query.limit || 20,
          q      = toLucene(req.query.query),
          query  = [
              'full_search:', q,
              ' OR name_search:', q,
            ].join('');
            
      // build a nodes edges graph
      helpers.cypherGraph(queries.get_graph_matching_entities, {
        query: query, 
        limit: 100
      }, function (err, graph) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          graph: graph
        });
      })
    }
  }
}