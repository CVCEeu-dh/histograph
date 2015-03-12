/**

  API Controller for hg:User
  ===
  
*/
var settings   = require('../settings'),
    neo4j      = require('seraph')(settings.neo4j.host);
    
module.exports = {
  /*
    give some information about current session
  */
  session: function (req, res) {
    return res.json({
      user: req.session
    });
  },

  /*
    get some user, if current user is authenticated of cours
  */
  
}