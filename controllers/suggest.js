/**
 * Suggest controller for autocompletion
 * =====================================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers'),
    models    = require('../helpers/models'),
    
    parser    = require('../parser.js'),
    neo4j     = require('seraph')(settings.neo4j.host),
    validator  = require('../validator'),
        
    queries  = require('decypher')('./queries/suggest.cyp'),
    
    async     = require('async'),
    _         = require('lodash');


/*
  Tiny helper to tranform words in a valid lucenequery
  according to ccurrent lucene indexes
*/
function toLucene(query) {
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
        console.log(results.count_items.length)
        
        console.log(_.flatten(results.count_items, true));
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
          total_items: _.unique(
            _.map(
              _.compact(
                _.flatten(results.count_items)
              ), 'id'
            )
          ).length,
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
      var q = toLucene(req.query.query);
      
  
      neo4j.query(queries.lucene_query, {
        resource_query: [
          'full_search:', q
        ].join(''),
        person_query: 'name_search:' + q,
        limit: req.query.limit || 4
      }, function (err, items) {
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
            console.log(err)
            if(err)
              callback(err);
            else
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
      Caption and title multilanguage search.
      @todo: use the solr endpoint wherever available.
    */
    entities: function (req, res) {
      var offset = +req.query.offset || 0,
          limit  = +req.query.limit || 20,
          q      = toLucene(req.query.query),
          query  = [
              
              'name_search:', q,
            ].join('');
      //console.log("query", query)
      // get countabilly
      async.parallel({
        get_matching_entities_count: function (callback) {
          neo4j.query(queries.get_matching_entities_count, {
            query: query,
          }, function (err, items) {
            if(err)
              callback(err);
            else
              callback(null, items);
          })
        },
        get_matching_entities: function (callback) {
          neo4j.query(queries.get_matching_entities, {
            query: query,
            offset: offset,
            limit: limit
          }, function (err, items) {
            if(err)
              callback(err);
            else
              callback(null, items);
          })
        }
      }, function (err, results) {
        if(err)
          return helpers.cypherQueryError(err, res);
        
        return res.ok({
          items: results.get_matching_entities.map(function (d) {
            d.props.languages = _.values(d.props.languages)
            return d;
          }),
        }, {
          total_count: results.get_matching_entities_count.total_count,
          offset: offset,
          limit: limit
        });
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