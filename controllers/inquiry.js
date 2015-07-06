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
      create a new comment on this inquiry
    */
    createComment: function (req, res) {
      var form    = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      inquiry.createComment(+form.params.id, {
        content: form.params.content,
        user: req.user
      }, function (err, comment) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('done:create_comment', {
          user: req.user.username,
          doi: +req.params.id, 
          data: inquiry
        });
        return res.ok({
          item: comment
        });
      })
    },
    
    /*
      return the list of related inquiries
    */
    getRelatedComment: function(req, res) {
      var comment   = require('../models/comment'), 
          form = validator.request(req, {
            limit: 20,
            offset: 0
          });

      if(!form.isValid)
        return helpers.formError(form.errors, res);
      comment.getMany({
        related_to: +form.params.id,
        limit: +form.params.limit,
        offset: +form.params.offset
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items
        }, {
          params: form.params
        });
      })
    },
    /*
      create an inquiry. Cfr resource create related inquiry instead.
    */
    create: function(req, res) {
      // validate params here
    }
  }
};