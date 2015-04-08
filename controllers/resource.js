/**

  API Controller for hg:Resource
  ===
  
*/
var settings   = require('../settings'),
    queries    = require('decypher')('./queries/resource.cyp'),
    helpers    = require('../helpers'),
    YAML       = require('yamljs'),

    _          = require('lodash'),

    neo4j      = require('seraph')(settings.neo4j.host);
    

module.exports = function(io){
  // io socket event listener
  io.on('connection', function(socket){
    // console.log('socket.request.session.passport.user', socket.request.session)
    var cookie_string = socket.request.headers.cookie;
    //  console.log('a user connected', cookie_string);

    socket.on('start:commenting', function (data) {
      console.log(socket.request.session.passport.user.username, 'is writing a comment on', data.id);
      // emit back to already connected people..
      io.emit('start:commenting', {
        user: socket.request.session.passport.user.username,
        data: data.id
      });
    });

    socket.on('continue:commenting', function (data) {
      console.log(socket.request.session.passport.user.username, 'is writing a comment on', data.id);
      // emit back to already connected people..
      io.emit('continue:commenting', {
        user: socket.request.session.passport.user.username,
        data: data.id
      })
    });
  });

  return {
    /*
      get a single resources, along with comments and inquiries (with relationships).
    */
    getItem: function (req, res) {
      neo4j.query(queries.get_resource, {
        id: +req.params.id
      }, function(err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        
        var item = items[0].resource;
        //console.log(item)
        item.versions = _.values(item.versions).map(function (d) {
          if(d.yaml)
            d.yaml = YAML.parse(d.yaml);
          return d;
        });
        item.locations = _.values(item.locations);
        item.persons = _.values(item.persons);
        item.comments = _.values(item.comments);
        item.version = _.find(item.versions, {first: true}); // the original one;
        
       
        return res.ok({
          item: item
        });
      })
    },
    /*
      get some, based on the limit/offset settings
    */
    getItems: function (req, res) {
      neo4j.query(queries.get_resources, {
        limit: 20,
        offset: 0
      }, function(err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        
        return res.ok({
          items: items
        });
      })
    },

    /*
      create a comment on this resource
    */
    createComment: function(req, res) {
      console.log('ici', req.body.content, req.user);
      var now = helpers.now();

      // add dummy comments on it.
      neo4j.query(queries.add_comment_to_resource, {
        id: +req.params.id,
        content: req.body.content,
        tags: req.body.tags,
        username: req.user.username,
        creation_date: now.date,
        creation_time: now.time
      }, function (err, items) {
        console.log(err, items);
        if(err)
          return helpers.cypherQueryError(err, res);
        // emit the event for those connected on resource. to be refactored.
        io.emit('done:commenting', {
          user: req.user.username,
          resource_id: +req.params.id, 
          data: items[0].comments[0]
        });

        return res.ok({
          items: items[0].comments
        });
      })
    }
  }
}