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


module.exports =  function(io){
  return {
    /*
      Return a list of possible path connecting all of the comma separated nodes given
      api/suggest/
    */
    allShortestPaths: function(req, res) {
      var ids = req.params.ids.split(',').filter(function (d) {
        return !isNaN(d)
      }).map(function (d) {
        return +d;
      });
      
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
    /*
    */
    getNeighbors: function (req, res) {
       var ids = req.params.ids.split(',').filter(function (d) {
        return !isNaN(d)
      }).map(function (d) {
        return +d;
      });
      
      if(!ids.length)
        return res.error({})
      neo4j.query(queries.get_neighbors, {
        ids: ids,
        labels: ['person', 'place', 'location', 'resource', 'collection'],
        limit: 1000
      }, function (err, items) {
        console.log(err)
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items
        });
      })
    },
    
     /**
      search the query among:resources and entities. Return a list of objects, max. 3 per 'entities and 5 for resources.
      Norammly if the user clicks on "submit free search" he will be sent to search page wich will display top search results.
      carefully divided by
      next(err=null, [])
     */
    simple: function(req, res) {
      var q = '*' + req.query.query.split(/[^\w]/).map(function (d) {
        return d.trim().toLowerCase()}).join('*') + '*';
      
      neo4j.query(queries.lucene_query, {
        query: [
          'title_search:',
            q,
          ' OR caption_search:',
            q,
          ' OR name:',
            q,
        ].join(''),
        limit_resources: 5,
        limit_entities: 5
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items.map(function (d) {
            d.languages = _.values(d.languages)
            return d;
          })
        });
      })
    }
  }
}