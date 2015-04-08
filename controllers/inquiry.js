/**

  API Controller for hg:Inquiry
  ===
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    multer     = require('multer'),
    _          = require('lodash'),

    neo4j      = require('seraph')(settings.neo4j.host);


module.exports = function(){
  return {}
};