/**
 * Inquiry Model
 * =============
 * 
 * Inquiry is a special comment thread where comment-[r:answers]->inquiry-[r:questions]->(n)
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/inquiry.cyp'),
    
    clc       = require('cli-color'),
    async     = require('async'),
    _         = require('lodash');
    
    

module.exports = {
  get: function(id, next) {
    neo4j.query(queries.get_inquiry, {
      id: +id
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      if(!node.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      // select current abstract based on the language chosen, fallback to english
      next(null, node[0]);
    })
  },
  
  create: function(user, properties, next) {
    var now = helpers.now();
    
    neo4j.query(queries.merge_inquiry, {
      name: properties.name,
      description: properties.description,
      language: helpers.text.language([properties.name, properties.description].join('. ')),
      creation_date: now.date,
      creation_time: now.time
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      if(!node.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      // select current abstract based on the language chosen, fallback to english
      next(null, node[0]);
    })
  },
  
  remove: function(id, next) {
    
  }
}