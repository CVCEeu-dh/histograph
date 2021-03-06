/* eslint-disable */

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
    _          = require('lodash'),
    
    Resource   = require('../models/resource');



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


module.exports =  function(io){
  return {
    /*
      Return a list of possible paths connecting at least two nodes of the given set.
      api/suggest/allinbetween
    */
    allInBetween: function(req, res) {
      // At least two with
      var form = validator.request(req, {
            limit: 20,
            offset: 0
          }, {
            fields: [
              validator.SPECIALS.ids
            ],
            required: {
              'ids': true
            }
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      models.getMany({
        queries: {
          count_items: queries.count_all_in_between,
          items: queries.all_in_between,
        },
        params: {
          ids: form.params.with,
          limit: form.params.limit,
          offset: form.params.offset
        }
      }, function (err, results) {
        // ids of all the discovered.
        var discovered = _.uniq(_.flatten(results.count_items, true), 'id');
      
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
              graph.nodes[results.items[i].paths[j].id].importance =1
              graph.nodes[results.items[i].paths[j].id].degree = 1
            } else {
              graph.nodes[results.items[i].paths[j].id].degree++;
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
      var ids = helpers.text.toIds(req.params.ids);
      
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
      // console.log(form.params)
      models.getMany({
        queries: {
          count_items: queries.count_shared_resources,
          items: queries.get_shared_resources
        },
        params: form.params
      }, function (err, results) {
        if(err)
          return helpers.cypherQueryError(err, res);
        helpers.models.getMany(err, res, results.items, results.count_items, form.params);
      })
    },

    getSharedEntities: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0,
            entity: 'person'
          }, {
            fields: [
              validator.SPECIALS.entity
            ]
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      models.getMany({
        queries: {
          count_items: queries.count_shared_entities,
          items: queries.get_shared_entities
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
        id: req.params.id
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        if(!items[0].id){
          res.error(404);  
          return;
        }
        return res.ok({
          item: items[0]
        });
      })
    },
    
    getUnknownNodes: function (req, res) {

      var ids = helpers.text.toIds(req.params.ids);
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
      var ids = helpers.text.toIds(req.params.ids);
      
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

      const language = 'en'
          
      var form = validator.request(req, {
            limit: 5,
            offset: 0,
            language
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      resource_query = parser.toLucene(req.query.query)
      // resource_query = '(' + parser.toLucene(req.query.query, 'full_search') + ') OR (' + parser.toLucene(req.query.query, 'title_search') + ')';
      entity_query = parser.toLucene(req.query.query, 'name_search');
      // lucene.setSearchTerm('full_search:(' + req.query.query + ') OR title_search:(' + req.query.query+')');
      // resource_query = '' + lucene.getFormattedSearchTerm();
      
      // lucene.setSearchTerm('name_search:' + req.query.query);
      // entity_query = '' + lucene.getFormattedSearchTerm();
      // console.log('resource_query', resource_query)
      // console.log('entity_query', entity_query)
      
      neo4j.query(queries.lucene_query, {
        resource_query: resource_query,
        entity_query: entity_query,
        limit: form.params.limit,
        language: form.params.language,
        resource_index: `resource_text_index_${language}`
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
      Basic element counting
    */
    getStats: function (req, res) {
      var resource_query,
          entity_query;

      const language = 'en'
          
      var form = validator.request(req, {
            limit: 20,
            offset: 0,
            language
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);

      // resource_query = '(' + parser.toLucene(req.query.query, 'full_search') + ') OR (' + parser.toLucene(req.query.query, 'title_search') + ')';
      // entity_query = parser.toLucene(req.query.query, 'name_search');
      resource_query = parser.toLucene(req.query.query)
      entity_query = parser.toLucene(req.query.query, 'name_search');

      neo4j.query(queries.count, {
        resource_query: resource_query,
        entity_query: entity_query,
        resource_index: `resource_text_index_${language}`
        
      }, function (err, groups) {
        if (err) {
          
        }
        if(err)
          return helpers.cypherQueryError(err, res);
        
        return res.ok({
          items: []
        }, {
          groups: groups
        });
      })
    },
    
    
    /*
      Lucene results. can also be used for typeahead, 
      since it is very fast.
    */
    getEntities: function (req, res) {
      var form = validator.request(req, {
            limit: 20,
            offset: 0,
            entity: 'person'
          }, {
            fields: [
              // validator.SPECIALS.entity
            ]
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      var q = parser.toLucene(req.query.query, 'name_search');
      form.params.query = q;
      console.log('get_entities', form.params.query);
      models.getMany({
        queries: {
          count_items: queries.get_matching_entities_count,
          items: queries.get_matching_entities
        },
        params: form.params,
        // ignoreCount: true
      }, function (err, results) {
        if(err)
          return helpers.cypherQueryError(err, res);
        helpers.models.getMany(err, res, results.items, results.count_items, form.params);
      });
    },
    
    /*
      Lucene results. can also be used for typeahead, since it is very fast.
    */
    /**
     * RK: Confirming - it is used.
     */
    getResources: function (req, res) {
      const language = 'en'

      var form = validator.request(req, {
            limit: 20,
            offset: 0,
            resource_index: `resource_text_index_${language}`
          }, {
            
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      var q = parser.toLucene(req.query.query); //, 'full_search');
      form.params.query = q;
      
      models.getMany({
        queries: {
          count_items: queries.count_resources,
          items: queries.get_resources
        },
        params: form.params
      }, function (err, results) {
        if(err)
          console.log(err)
        helpers.models.getMany(err, res, results.items, results.count_items, form.params);
      });
    },
    
    /**
     * RK: Confirming - it is used.
     */
    getResourcesGraph: function (req, res) {

      const language = 'en'

      var query = '',
          form = validator.request(req, {
            limit: 20,
            offset: 0,
            query: '',
            resource_index: `resource_text_index_${language}`
          });

      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      form.params.query = parser.toLucene(form.params.query); //, 'full_search');
      
      query = parser.agentBrown(queries.get_matching_resources_graph, form.params);
      // build a nodes edges graph
      helpers.cypherGraph(query, form.params, function (err, graph) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          graph: graph
        });
      });
    },
    
    getEntitiesGraph: function (req, res) {
      var form = validator.request(req, {
            limit: 20,
            offset: 0,
            query: '' // empty query by defual it's INVALID
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      console.log('query passed', form.params.query)
      var q = parser.toLucene(form.params.query, 'name_search');

      // build a nodes edges graph
      helpers.cypherGraph(queries.get_matching_entities_graph, {
        query: q, 
        limit: 100,
        entity: form.params.entity
      }, function (err, graph) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          graph: graph
        });
      })
    },
    
    
    /*
      get all in between resource by using the allinbetween algo.
      Queries: get_all_in_between_resources, count_all_in_between_resources
      Nothe that ids list is required (it comes withthe request)
    */
    getAllInBetweenResources: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      models.getMany({
        queries: {
          count_items: queries.count_all_in_between_resources,
          items: queries.get_all_in_between_resources
        },
        params: form.params
      }, function (err, results) {
        if(err)
          return helpers.cypherQueryError(err, res);
        
        helpers.models.getMany(err, res, results.items, results.count_items, form.params); 
        // Resource.getByIds(_.assign({}, form.params, {
        //   ids: _.map(results.items, 'id')
        // }), function (err, items){
        //   helpers.models.getMany(err, res, items, results.count_items, form.params);
        // });
        
      });
    },
    /*
      get all in between algorrithm
      takes the top common nodes at distance 0,2.
      Require form.params.entity (entity otherwise)
    */
    getAllInBetweenGraph: function(req, res) {
      var nodes = {},
          edges = {},
          query = '';
          
      var form = validator.request(req, {
            limit: 100,
            offset: 0,
            entity: 'person'
          }, {
            fields: [
              validator.SPECIALS.graphLimit,
              validator.SPECIALS.entity
            ]
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      query = parser.agentBrown(queries.get_all_in_between_graph, form.params);

      helpers.cypherGraph(query, form.params, function (err, graph) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          graph: graph
        });
      });
    },

    getAllInBetweenTimeline: function(req, res) {
      var form = validator.request(req);

      if(!form.isValid)
        return helpers.formError(form.errors, res);

      helpers.cypherTimeline(queries.get_all_in_between_timeline, form.params, function (err, timeline) {
        if(err)
          return helpers.cypherQueryError(err, res);
        else
          return res.ok({
              timeline: timeline
            }, {
              params: form.params
            });
      });
    },

    /*
      Proxy suggest for VIAF
    */
    viaf: {
      autosuggest: function(req, res) {
        var services = require('../services');

        var form = validator.request(req, {
          limit: 10,
          offset: 0,
          query: ''
        });
        // console.log(form)
        if(!form.isValid)
          return helpers.models.formError(form.errors, res);
        services.viaf.autosuggest({
          query: form.params.query
        }, function (err, result){
          if(err)
            res.error();
          else
            res.ok({
              items: result.result
            },form.params);
        })
      }
    },

    /*
      Proxy suggest for DBPEDIA
    */
    dbpedia: function(req, res) {
      var services = require('../services');

      var form = validator.request(req, {
        limit: 10,
        offset: 0,
        link: ''
      }, {
        fields:[
          {
            field:'link',
            check: 'matches',
            args: [
              /^[a-zA-Z0-9,_\-%\.]+$/
            ]
          }
        ]
      });
      // console.log(form)
      if(!form.isValid)
        return helpers.models.formError(form.errors, res);
      helpers.dbpediaPerson(form.params.link, function (err, result){
        if(err)
          res.error();
        else
          res.ok({
            item: result
          },form.params);
      })
    }
  }
}