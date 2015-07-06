/**
 * Comment Model
 * =============
 * 
 * Normally, (c:comment:observation)-[r:answers]->(i:inquiry)-[r:questions]->(n:resource)
 * and
 * 
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    parser    = require('../parser.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/comment.cyp'),

    async     = require('async'),
    _         = require('lodash');
    

module.exports = {
  getMany: function(properties, next) {
    var query = parser.agentBrown(queries.get_comments, properties);
    neo4j.query(query, properties, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes);
    })
  }
};