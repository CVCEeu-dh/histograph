/**

  API Controller for hg:Collection
  ===
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),

    _          = require('lodash'),

    collection = require('../models/collection');
    

module.exports = function(io){
  // io socket event listener
  if(io)
     io.on('connection', function (socket) {
      // console.log('socket.request.session.passport.user', socket.request.session)
      var cookie_string = socket.request.headers.cookie;
      
      socket.on('collection:create', function (data) {
        console.log(socket.request.session.passport.user.username, 'is creating a new collection', data.id);
        // emit back to already connected people..
        io.emit('collection:create', {
          user: socket.request.session.passport.user.username,
          data: data.id
        });
      });
    });
  
  return {
    /*
      get single item
    */
    getItem: function (req, res) {
      collection.get(+req.params.id, function(err, item) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          item: item
        });
      })
    },
    
    /*
      get some, based on the limit/offset settings
    */
    getItems: function (req, res) {
      var options = {
        offset: req.params.offset,
        limit: req.params.limit
      };
      
      collection.getItems(options, function(err, item) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items
        });
      })
    },
  };
};