/**

  API Controller for hg:Resource
  ===
  
*/
var settings   = require('../settings'),
    queries    = require('decypher')('./queries/resource.cyp'),
    parser     = require('../parser'),
    helpers    = require('../helpers'),
    YAML       = require('yamljs'),

    _          = require('lodash'),

    neo4j      = require('seraph')(settings.neo4j.host),
    entity     = require('../models/entity');
    

module.exports = function(io){
  // io socket event listener
  if(io)
    io.on('connection', function(socket){
      var cookie_string = socket.request.headers.cookie;
    });

  return {
    /*
      get a single resources, along with comments and inquiries (with relationships).
      todo: get different language according to the different param.
    */
    getItem: function (req, res) {
      var language = req.query.language || 'en';
      entity.get(req.params.id, language, function (err, item) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          item: item
        });
      })
    },
    
    getRelatedResources: function (req, res) {
      entity.getRelatedResources(req.params.id, {
        limit: 10,
        offset: 0
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items
        });
      });
    }, // get graph of resources and other stugff, a graph object of nodes and edges
    
    getGraph: function (req, res) {
      entity.getGraph(req.params.id, {}, function (err, graph) {
         if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          graph: graph
        });
      }) 
    }
  }
}