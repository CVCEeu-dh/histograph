/**

  API Controller for hg:Inquiry
  ===
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    queries    = require('decypher')('./queries/inquiry.cyp'),
    validator  = require('../validator'),
    
    inquiry    = require('../models/inquiry'),
    _          = require('lodash');
    

module.exports = function(io) {
  return {
    /*
      get a single inquiry, the resource attached.
    */
    getItem: function (req, res) {
    
    },
    
    /*
      get some inquiries
    */
    getItems: function (req, res) {
      
      validator.queryParams(req.query, function (err, params, warnings) {
        if(err)
          return helpers.formError(err, res);
        
        inquiry.getMany(params, function (err, items) {
          return helpers.models.getMany(err, res, items, params, warnings);
        });
      });
    },
    
    /*
      create an inquiry
    */
    create: function(req, res) {
      // validate params here
    }
  }
};