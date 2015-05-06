

/**
 * Entity Model for Location, Organisation, etc...
 * ======================
 *
 */
var settings  = require('../settings'),
    services  = require('../services.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/entity.cyp'),
    
    async     = require('async'),
    _         = require('lodash');
    
    

module.exports = {
  discover: function(id, next) {
    // quetly does textrazor entity extraction.
    neo4j.read(id, function(err, node) {
      if(err) {
        next(err);
        return;
      }
      console.log(node)
      var q = async.waterfall([
        function (nextTask) {
          if(!node.links_wiki) {
            nextTask()
            return
          };
          if(node.links_wiki.match(/[^a-zA-Z_\-]/g))
            node.links_wiki = encodeURIComponent(node.links_wiki);
    
          // call dbpedia page
          services.dbpedia({
            link: node.links_wiki
          }, function(err, wiki){
            console.log( 'd',
              _.compact(_.pluck(wiki, 'http://dbpedia.org/property/dateOfDeath')).pop().pop()
            )
            console.log( 'd',
              _.findWhere(wiki, 'http://dbpedia.org/property/dateOfBirth')
            )
          });
        }
      ], function(){
        return(null, node);
      })
      
        
      
    })
  }
};