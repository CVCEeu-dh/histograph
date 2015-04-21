/**

  API Controller for hg:Resource
  ===
  
*/
var settings   = require('../settings'),
    queries    = require('decypher')('./queries/resource.cyp'),
    parser     = require('../parser'),
    helpers    = require('../helpers'),
    YAML       = require('yamljs'),

    _          = require('lodash'),

    neo4j      = require('seraph')(settings.neo4j.host);
    

module.exports = function(io){
  // io socket event listener
  if(io)
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
        if(!items.length)
          return res.error({}); // empty

        var item = items[0].resource;
        //console.log(item)
        item.versions = _.values(item.versions).map(function (d) {
          if(d.yaml)
            d.yaml = YAML.parse(d.yaml);
          return d;
        });

        item.annotations = item.versions
          .filter(function (d) {
            return d.service == 'textrazor' // @todo: differenciate version:textannotation to version:imageannotation. mimetype? label?
          })
          .map(function (d) {
            var annotations = parser.annotate([
              item.props.name || '',
              item.props.source || '',
              item.props.caption || ''
            ].join('§ '), d.yaml)
              .split('§ ');

            d.annotations = {
              name: annotations[0],
              source: annotations[1],
              caption: annotations[2]
            };

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
      get other max 10 similar resources based on:
      1. co-occurrence presence of the different entities
      2. date proximity
    */
    getRelatedItems: function (req, res) {
      // first of all get same person / time proximity measure
      neo4j.query(queries.get_similar_resource_ids_by_entities, {
        id: +req.params.id,
        limit: 100,
      }, function(err, ids) {
        // resort
        // var _ids = {};
        // for(var i=0; i<ids.length; i++) {
        //   if(!_ids[ids[i].id])
        //     _ids[ids[i].id] = ids[i]
        //   _ids[ids[i].id]
        // }
        
        neo4j.query(queries.get_resources_by_ids, {
          ids: _.map(_.take(ids, 50), 'id'),
          limit: 50,
          offset: 0
        }, function(err, items) {
          if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            items: items
          });
        });
        
        
      })
      
      
      
      // neo4j.query(queries.get_similar_resources, {
      //   id: +req.params.id,
      //   limit: 20,
      //   offset: 0
      // }, function(err, items) {
      //   if(err)
      //     return helpers.cypherQueryError(err, res);
      //   return res.ok({
      //     items: items
      //   });
      // });
    },
    
    /**
      We should move this to entities instead.
    */
    getCooccurrences: function (req, res) {
      neo4j.query(queries.get_cooccurrences, {
        skip: 0,
        limit: +req.params.limit || 1000,
      }, function(err, items){
        if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            items: items
          });
      });
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