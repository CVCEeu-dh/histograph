/**

  API Controller for hg:Issue
  ===
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    queries    = require('decypher')('./queries/issue.cyp'),
    validator  = require('../validator'),
    
    Issue    = require('../models/issue'),
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
      Issue.get({id: form.params.id}, function (err, item) {
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
      Issue.getMany(form.params, function (err, items) {
        return helpers.models.getMany(err, res, items, form.params);
      });
    },
    /*
      create a new comment on this Issue
    */
    createComment: function (req, res) {
      var form    = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      Issue.createComment(+form.params.id, {
        content: form.params.content,
        user: req.user
      }, function (err, comment) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('done:create_comment', {
          user: req.user.username,
          doi: +req.params.id, 
          data: comment
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
      create an issue. Cfr resource create related inquiry.
    */
    create: function(req, res) {
      // validate params here
      return res.error(404);
    },
    upvote: function(req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(err, res);
      Issue.update(form.params.id, {
        upvoted_by: req.user.username
      }, function (err, iss) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('issue:upvoted', {
          user: req.user.username,
          doi: +req.params.id, 
          data: iss
        });
        return res.ok({
          item: iss
        });
      })
      
    },
    downvote: function(req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(err, res);
      Issue.update(form.params.id, {
        downvoted_by: req.user.username
      }, function (err, com) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('issue:downvoted', {
          user: req.user.username,
          doi: +req.params.id, 
          data: com
        });
        return res.ok({
          item: com
        });
      })
      
    }
  }
};