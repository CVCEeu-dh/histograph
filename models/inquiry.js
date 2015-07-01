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
  /*
    Create a new inquiry and assign it to the properties.user provided. Verify at controller level that a user has been assigned.
    properties: {
      name: '',
      description: '',
      user: { ... }
    }
  */
  create: function(properties, next) {
    var now = helpers.now();
    
    neo4j.query(queries.merge_inquiry, {
      name: properties.name,
      description: properties.description,
      language: helpers.text.language([properties.name, properties.description].join('. ')),
      creation_date: now.date,
      creation_time: now.time,
      username: properties.user.username
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      if(!node.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      next(null, node[0]);
    })
  },
  /*
    This method MUST NOT HAVE an http API access.
    Remove the inquiry permanently.
  */
  remove: function(id, next) {
    neo4j.query(queries.remove_inquiry, {
      id: +id
    }, function (err) {
      if(err)
        next(err);
      else
        next();
    })
  }
}