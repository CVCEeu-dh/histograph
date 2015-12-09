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
    Entity     = require('../models/entity');
    

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
        Entity.get(req.params.id, function (err, item) {
          if(err == helpers.IS_EMPTY)
            return res.error(404);
          if(err) 
            return helpers.cypherQueryError(err, res);
          return res.ok({
            item: item
          });
        })
      else
        Entity.getByIds(ids, function (err, items) {
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
      Update [:appear_in] relationship, entity side

      api: api/entity/:entity_id(\\d+)/related/resource/:resource_id(\\d)+/:action(upvote|downvote)
      
      According to `:action` param, modify or create the relationship between an entity and a resource. If there is no action, an upvoted relationship will be created.
      Anyway, the authentified user becomes a "curator" of the entity (he/she knows a lot about it).

    */
    updateRelatedResource: function (req, res) {
      var form = validator.request(req);
      // discard
      if(form.params.action == 'discard') {
        removeRelatedResource(req,res);
        return;// res.ok({}, form.params);
      } else if(form.params.action) {
        Entity.updateRelatedResource({
          id: +form.params.entity_id
        },
        {
          id: +form.params.resource_id
        },
        req.user,
        form.params, function (err, item) {
          if(err)
            return helpers.cypherQueryError(err, res);

          io.emit('entity:' + form.params.action + '-related-resource:done', {
            user: req.user.username,
            id: +form.params.entity_id,
            data: item,
            resource: {
              id: +form.params.resource_id
            }
          });

          return res.ok({
            item: item
          }, form.params);
        })
      } else {
        return res.ok({}, form.params);
      }
        
      // if(!form.params.action) {
      //   // create a relationship
      //   Entity.addRelatedResource();
      // }
      // Entity.updateRelatedResource()
    },

    createRelatedResource: function(req, res) {
      var form = validator.request(req);

      Entity.createRelatedResource({
        id: +form.params.entity_id
      },
      {
        id: +form.params.resource_id
      },
      req.user,
      form.params, function (err, item) {

        io.emit('entity:create-related-resource:done', {
          user: req.user.username,
          id: +form.params.entity_id,
          data: item,
          resource: {
            id: +form.params.resource_id
          }
        });

        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          item: item
        }, form.params);
      });
    },
    /*
      remove a relationship between an entity and a resource
    */
    removeRelatedResource: function(req, res) {
      var form = validator.request(req);

      Entity.removeRelatedResource({
        id: +form.params.entity_id
      },
      {
        id: +form.params.resource_id
      },
      req.user,
      form.params, function (err, item) {
        if(err)
          return helpers.cypherQueryError(err, res);

        io.emit('entity:remove-related-resource:done', {
          user: req.user.username,
          id: +form.params.entity_id,
          data: item,
          resource: {
            id: +form.params.resource_id
          }
        });

        return res.ok({item: item}, form.params);
      });
    },

    /*
      Create an isse, optionally providing a solution.
      Cfr models.issue
    */
    /*
      create a new issue for this entity
      use cases.

      1)  with request param
          ```if req.query.kind == Issue.TYPE```
          one can raise the issue that the 'label' for that entity is not correct.
          Then, 
          ```req.query.solution = 'correct label'```
      
      2)  with request param
          ```if req.query.kind == Issue.IRRELEVANT```
          one can raise the issue that the entity is a dumb error.
          No solution should be provided for this issue.

      3)  with request param
          ```if req.query.kind == Issue.MERGEABLE```
          one can raise the issue that the entity can be merged with another entity.
          Then,
          ```req.query.solution = <merge-to-entity-id>```

      Use case 3 should preload the entity in Issue.get (@todo)
    */
    createRelatedIssue: function (req, res) {
      var Issue   = require('../models/issue'), 
          form = validator.request(req, {}, {
            fields: [
              validator.SPECIALS.issueType
            ]
          });
      // console.log(form.params)
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      // if form.params.kind == Issue.DATE
      // check that the solution param is an array of valid dates.
      // if form.params.kind == Issue.TYPE
      //   check that the solution param is an available label
      Entity.update(+form.params.id, {
        issue: form.params.kind
      }, function (err, entity) {
        if(err)
          return helpers.cypherQueryError(err, res);
        Issue.create({
          kind:         form.params.kind,
          solution:     form.params.solution, 
          questioning:  form.params.id,
          user:         req.user
        }, function (err, issue) {
          if(err)
            return helpers.cypherQueryError(err, res);
          io.emit('entity:create-related-issue:done', {
            user: req.user.username,
            id:  +form.params.id, 
            data: issue
          });
          return res.ok({
            item: issue
          });
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
      Entity.update(form.params.id, {
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
      Entity.update(form.params.id, {
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
      Entity.getRelatedResources(form.params, function (err, items, info) {
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
     
      Entity.getRelatedEntities(form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    },
    
    getRelatedPersons: function (req, res) {
      Entity.getRelatedPersons(req.params.id, {
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
      
      Entity.getRelatedEntitiesGraph(form.params, function (err, graph) {
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
      
      Entity.getRelatedResourcesGraph(form.params, function (err, graph) {
        return res.ok({
          graph: graph
        }, {
          type: 'monopartite'
        });
      });
    },
    
  }
}