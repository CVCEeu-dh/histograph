/**

  API Controller for hg:Comment
  ===
  
  Some REST api available for commenting purpose: edit comment,
  delete your own comment, vote up or down a comment.
  Also cfr. controllers/inquiry and controllers/resource
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    queries    = require('decypher')('./queries/inquiry.cyp'),
    validator  = require('../validator'),
    
    comment    = require('../models/comment'),
    _          = require('lodash');

module.exports = function(io) {
  return {
    upvote: function(req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(err, res);
      comment.update(form.params.id, {
        upvoted_by: req.user.username
      }, function (err, com) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('done:update_comment', {
          user: req.user.username,
          doi: +req.params.id, 
          data: com
        });
        return res.ok({
          item: com
        });
      })
      
    },
    downvote: function(req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(err, res);
      comment.update(form.params.id, {
        downvoted_by: req.user.username
      }, function (err, com) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('done:update_comment', {
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