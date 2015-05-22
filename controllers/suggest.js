/**
 * Suggest controller for autocompletion
 * =====================================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    parser    = require('../parser.js'),
    neo4j     = require('seraph')(settings.neo4j.host),
    
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
          'type_search: resource AND (',
          'title_search:', q,
          ' OR caption_search:', q,
          ')'
        ].join(''),
        person_query: 'name_search:' + q,
        limit: req.query.limit || 4
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        console.log(items.length)
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
    resources: function(req, res) {
      var offset = +req.query.offset || 0,
          limit  = +req.query.limit || 20,
          q      = toLucene(req.query.query),
          query  = [
              'type_search: resource AND (',
              'title_search:', q,
              ' OR caption_search:', q,
              ')'
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
          items: results.get_matching_resources.map(function (d) {
            d.props.languages = _.values(d.props.languages)
            return d;
          }),
        }, {
          total_count: results.get_matching_resources_count.total_count,
          offset: offset,
          limit: limit
        });
      });
    }
  }
}