/**
 * Inquiry Model
 * =============
 * 
 * Inquiry is a special comment thread where comment-[r:answers]->inquiry-[r:questions]->(n)
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    parser    = require('../parser.js'),
    
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
    Available params are limit, offset, order by.
  */
  getMany: function(params, next) {
    var query = parser.agentBrown(queries.get_inquiries, params);
    
    neo4j.query(query, params, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      
      // select current abstract based on the language chosen, fallback to english
      next(null, nodes);
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
      slug: helpers.text.slugify(properties.user.username + ' ' + properties.name),
      name: properties.name,
      description: properties.description,
      language: helpers.text.language([properties.name, properties.description].join('. ')),
      creation_date: now.date,
      creation_time: now.time,
      username: properties.user.username,
      doi: properties.doi
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
    Create and attach a comment on the inquiry
    name: name of the inquiry
    content: 
    username
  */
  createComment: function(id, properties, next) {
    var now = helpers.now();
    neo4j.query(queries.merge_inquiry_comment, {
      id: id,
      content: properties.content,
      language: helpers.text.language(properties.content, 'en'),
      username: properties.user.username,
      slug: helpers.text.slugify(properties.user.username + ' ' + properties.content.substr(0, 32)),
      creation_date: now.date,
      creation_time: now.time,
    }, function (err, node) {
      // console.log(err, node)
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