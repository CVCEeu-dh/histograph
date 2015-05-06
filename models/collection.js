/**
 * Model for Collection
 * ====================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    parser    = require('../parser.js'),
    neo4j     = require('seraph')(settings.neo4j.host),
    
    queries   = require('decypher')('./queries/collection.cyp'),
    
    async     = require('async'),
    _         = require('lodash');


module.exports = {
  /**
    get a complete resource object (with versions, comments etc...).
    @param language - 'en' or 'fr' or other two chars language identifier 
   */
  get: function(id, next) {
    neo4j.query(queries.get_collection, {id: id}, function (err, items) {
      if(err) {
        next(err);
        return
      }
      
      var item = items[0];
      
      item.comments = _.values(item.comments);
      item.users    = _.values(item.users);
      
      next(null, item);
    });  
  },
  /*
    possible properties: limit, offset
  */
  getItems: function(properties, next) {
    var options = _.merge({
      offset: 0,
      limit: 20
    }, properties);
    
    neo4j.query(queries.get_collections, options, function (err, items) {
      if(err) {
        next(err);
        return
      }
      next(null, items);
    });  
  },
};