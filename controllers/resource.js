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

    neo4j      = require('seraph')(settings.neo4j.host),
    resource   = require('../models/resource');
    

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
      todo: get different language according to the different param.
    */
    getItem: function (req, res) {
      resource.get(req.params.id, function(err, item) {
        if(err == helpers.IS_EMPTY)
          return res.error(404);
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
        // remap the ids according to a specific order
        var sorted = _.sortByOrder(_.map(_.groupBy(ids, 'id'), function (group) {
          return {
            id: group[0].id,
            dt: group[0].time_proximity,
            rating: group.length * (_.sum(group, 'per_sim') + _.sum(group, 'loc_sim')*.1)
          }
        }), ['rating', 'dt'], [false, true]);
        // get the list of resources matching the TOP 50 ids
        neo4j.query(queries.get_resources_by_ids, {
          ids: _.map(_.take(ids, 50), 'id'),
          limit: 50,
          offset: 0
        }, function(err, items) {
          if(err)
            return helpers.cypherQueryError(err, res);
          var ratings = _.indexBy(sorted, 'id');
          return res.ok({
            items: _.sortByOrder(_.map(items, function (d) {
              d.rating = ratings[d.id].rating
              d.dt = ratings[d.id].dt
              return d;
            }), ['rating', 'dt'], [false, true] )
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
          items: _.values(items[0].comments)
        });
      })
    },
     getGraph: function (req, res) {
      
      var type = 'bipartite';
      
      // get the right graph
      if(req.query.type) {
        if(['monopartite-entity', 'monopartite-resource'].indexOf(req.query.type) == -1) {
          return res.error({type: req.query.type + 'not found'});
        }
        type = req.query.type
      }
      
      if(type == 'bipartite') {
        resource.getGraphPersons(req.params.id, {}, function (err, graph) {
           if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            graph: graph
          }, {
            type: type
          });
        });
      } else if(type == 'monopartite-entity') {
        resource.getGraphPersons(req.params.id, {}, function (err, graph) {
           if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            graph: graph
          }, {
            type: type
          });
        });
      }
    },
    /*
      remap neo4j items to nice resource objects
      @return list of resource objects
    */
    model: function(items) {
      return items.map(function (d) {
        d.locations = _.values(d.locations || {});
        d.person    = _.values(d.persons || {});
        d.place     = _.values(d.places || {});
        d.comments  = _.values(d.comments || {});
        return d;
      });
    }
    
  }
}