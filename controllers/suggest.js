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
      }, function(err, items) {
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