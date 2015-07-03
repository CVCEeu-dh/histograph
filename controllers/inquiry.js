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
      var form = validator.request(req);
      if(!form.isValid)
        return helpers.formError(err, res);
      inquiry.get(+form.params.id, function (err, item) {
        return helpers.models.getOne(err, res, item, form.params);
      });
    },
    
    /*
      get some inquiries
    */
    getItems: function (req, res) {
      var form = validator.request(req, {
        limit: 10,
        offset: 0
      });
      if(!form.isValid)
        return helpers.formError(err, res);
        
      inquiry.getMany(form.params, function (err, items) {
        return helpers.models.getMany(err, res, items, form.params);
      });
    },
    
    /*
      create an inquiry. Cfr resource create related inquiry instead.
    */
    create: function(req, res) {
      // validate params here
    }
  }
};