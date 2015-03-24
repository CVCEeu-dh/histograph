/**

  API Controller for hg:Resource
  ===
  
*/
var settings   = require('../settings'),
    queries    = require('decypher')('./queries/resource.cyp'),
    neo4j      = require('seraph')(settings.neo4j.host);
    
module.exports = {
  /*
    give some information about current session
  */
  getItems: function (req, res) {
    neo4j.query(queries.get_resources, {
      limit: 20,
      offset: 0
    }, function(err, items) {
      return res.ok({
        items: items
      });
    })
    
  }

  /*
    get some user, if current user is authenticated of cours
  */
  
}