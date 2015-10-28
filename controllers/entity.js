/**

  API Controller for hg:Resource
  ===
  
*/
var settings   = require('../settings'),
    queries    = require('decypher')('./queries/resource.cyp'),
    parser     = require('../parser'),
    helpers    = require('../helpers'),
    validator  = require('../validator'),
     
    YAML       = require('yamljs'),

    _          = require('lodash'),

    neo4j      = require('seraph')(settings.neo4j.host),
    entity     = require('../models/entity');
    

module.exports = function(io){
  // io socket event listener
  if(io)
    io.on('connection', function(socket){
      var cookie_string = socket.request.headers.cookie;
    });

  return {
    /*
      get a single resources, along with comments and inquiries (with relationships).
      
    */
    getItem: function (req, res) {
      var ids = helpers.text.toIds(req.params.id);
      // not valid list of ids
      if(ids.length == 0)
        return res.error(404);
      if(ids.length == 1)
        entity.get(req.params.id, function (err, item) {
          if(err == helpers.IS_EMPTY)
            return res.error(404);
          if(err) 
            return helpers.cypherQueryError(err, res);
          return res.ok({
            item: item
          });
        })
      else
        entity.getByIds(ids, function (err, items) {
          if(err == helpers.IS_EMPTY)
            return res.error(404);
          if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            items: items
          }, {
            ids: ids
          });
        });
    },
    
    /*
      Create a comment specific for the entity ?
    */
    // createComment: function(req, res) {
    //   // console.log('ici', req.body.content, req.user);
    //   var now = helpers.now();

    //   // add dummy comments on it.
    //   neo4j.query(queries.add_comment_to_resource, {
    //     id: +req.params.id,
    //     content: req.body.content,
    //     tags: req.body.tags,
    //     username: req.user.username,
    //     creation_date: now.date,
    //     creation_time: now.time
    //   }, function (err, items) {
    //     console.log(err, items);
    //     if(err)
    //       return helpers.cypherQueryError(err, res);
    //     // emit the event for those connected on resource. to be refactored.
    //     io.emit('done:commenting', {
    //       user: req.user.username,
    //       resource_id: +req.params.id, 
    //       data: items[0].comments[0]
    //     });

    //     return res.ok({
    //       items: _.values(items[0].comments)
    //     });
    //   })
    // },
    
    upvote: function(req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(err, res);
      entity.update(form.params.id, {
        upvoted_by: req.user.username
      }, function (err, ent) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('done:upvote_entity', {
          user: req.user.username,
          doi: +req.params.id, 
          data: ent
        });
        return res.ok({
          item: ent
        });
      })
      
    },
    downvote: function(req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(err, res);
      entity.update(form.params.id, {
        downvoted_by: req.user.username
      }, function (err, ent) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('done:downvote_entity', {
          user: req.user.username,
          doi: +req.params.id, 
          data: ent
        });
        return res.ok({
          item: ent
        });
      })
      
    },
    
    getRelatedResources: function (req, res) {
       var form = validator.request(req, {
            limit: 10,
            offset: 0
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      // get the total available
      entity.getRelatedResources(form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    }, // get graph of resources and other stugff, a graph object of nodes and edges
    
    getRelatedEntities: function (req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0,
          }, {
            fields: [
              validator.SPECIALS.entity
            ],
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
     
      entity.getRelatedEntities(form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    },
    
    getRelatedPersons: function (req, res) {
      entity.getRelatedPersons(req.params.id, {
        limit: 10,
        offset: 0
      }, function (err, items) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items
        });
      });
    }, // get graph of resources and other stugff, a graph object of nodes and edges
    
    
    /*
      Get monopartite graph of related resource network
    */
    getRelatedEntitiesGraph: function (req, res) {
      var form = validator.request(req, {
            limit: 100,
            offset: 0
          }, {
            // increment the min
            fields: [
              {
                field: 'limit',
                check: 'isInt',
                args: [
                  {min: 1, max: 1000}
                ],
                error: 'should be a number in range 1 to max 1000'
              }
            ],
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      entity.getRelatedEntitiesGraph({
        id: form.params.id,
        entity: form.params.entity,
        limit: form.params.limit,
        offset: form.params.offset
      }, function (err, graph) {
        return res.ok({
          graph: graph
        }, {
          type: 'monopartite'
        });
      });
    },
    
    getRelatedResourcesGraph: function (req, res) {
      var form = validator.request(req, {
            limit: 100,
            offset: 0
          }, {
            // increment the min
            fields: [
              {
                field: 'limit',
                check: 'isInt',
                args: [
                  {min: 1, max: 1000}
                ],
                error: 'should be a number in range 1 to max 1000'
              }
            ],
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      entity.getRelatedResourcesGraph({
        id: form.params.id,
        limit: form.params.limit,
        offset: form.params.offset
      }, function (err, graph) {
        return res.ok({
          graph: graph
        }, {
          type: 'monopartite'
        });
      });
    },
    
  }
}