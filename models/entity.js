

/**
 * Entity Model for Location, Organisation, etc...
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/entity.cyp'),
    
    async     = require('async'),
    _         = require('lodash');
    
    

module.exports = {
  get: function(id, language, next) {
    neo4j.read(id, function(err, node) {
      if(err) {
        next(err);
        return;
      }
      // select current abstract based on the language chosen, fallback to english
      next(null, node)
    })
  },
  /**
   Enrich the entity by using dbpedia data (and yago).
   Since entities comes from Resource.discover activities, they're enriched with
   the properties coming with their dbpedia or yago link. It will then be possible
   to exstimqte better the adequancy of the entity to the context and rate the
   link...
   
   @param id - numeric internal Neo4J node identifier
   */
  discover: function(id, next) {
    // quetly does textrazor entity extraction.
    neo4j.read(id, function(err, node) {
      if(err) {
        next(err);
        return;
      }
      
      var q = async.waterfall([
        function (nextTask) {
          if(!node.links_wiki) {
            nextTask()
            return
          };
          if(node.links_wiki.match(/[^a-zA-Z_\-'%0-9,\.]/g)) {
            node.links_wiki = encodeURIComponent(node.links_wiki);
            console.log('wiki link changed!', node.links_wiki)
          }

          helpers.dbpediaPerson(node.links_wiki, function (err, res) {
            node = _.merge(node, res);
            // cleaning services
            if(node.services && node.services.length)
              node.services = _.unique(node.services);
            neo4j.save(node, function(err, res) {
              if(err) {
                console.log('error')
                next(err);
                return;
              }
              nextTask(null, node);
            })
            
          });
        },
        // 
        function (node, nextTask) {
          console.log('viaf check', node.links_viaf)
          if(!node.links_viaf) {
            nextTask()
            return
          };
          
          helpers.viafPerson(node.links_viaf, function (err, res) {
            console.log(res);
          });
        }
      ], function(){
        next(null, node);
      });
    })
  },
  /*
    Do different entities poinjt to the same data? This function allow to merge them along with their links !! @todo
  */
  disambiguate: function(id, next) {
    
  },
};