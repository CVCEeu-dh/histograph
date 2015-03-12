/**

  API Controller for hg:Resource
  ===
  
*/
var settings   = require('../settings'),
    neo4j      = require('seraph')(settings.neo4j.host);
    
module.exports = {
  /*
    give some information about current session
  */
  getItems: function (req, res) {
    return res.ok({
      user: req.session
    });
  }

  /*
    get some user, if current user is authenticated of cours
  */
  
}