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

    async      = require('async'),
    _          = require('lodash'),

    neo4j      = require('seraph')(settings.neo4j.host),

    Action     = require('../models/action'),
    Entity     = require('../models/entity'),
    Resource   = require('../models/resource');
    

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

      The special action 'merge' requires a with param to be present. 
      It upvotes or create a relationship with the TRUSTED entity given by params 'with' and
      downvotes the UNTRUSTED entity, given by the entity_id param.
      
      That is, 
    */
    updateRelatedResource: function (req, res) {
      var form = validator.request(req);

      if(!form.isValid)
        return helpers.formError(form.errors, res);

      var entity = {id: +form.params.entity_id},
          resource = {id: +form.params.resource_id};
      
      if(form.params.action == 'merge') {// upvote /create the first and downvote the second
        async.series([
          function discarded(next) {
            Entity.updateRelatedResource(entity, resource, req.user, {
              action: 'downvote'
            }, next);
          },
          function trusted(next) {
            Entity.createRelatedResource({
              id: +form.params.with.pop()
            }, resource, req.user, {}, next);
          }

          
        ], function(err, results) {
          if(err)
            return helpers.cypherQueryError(err, res);

          var item = results[0];

          item.related.merged = results[1];

          Action.create({
            kind: Action.MERGE,
            target: Action.APPEARS_IN_RELATIONSHIP,
            mentions: [resource.id, results[0].id],
            username: req.user.username,
            annotation: form.params.annotation
          }, function (err, action) {
            if(err)
              return helpers.cypherQueryError(err, res);
            // enrich outputted action with YAML parsed annotation
            if(action.type == Action.ANNOTATE) {
              action.props.annotation = parser.yaml(action.props.annotation);
            }
            // add action to response result item
            item.related.action = action;

            // creata a proper 'merge' action
            // console.log('MERGE RESULTS', item.related.merged)

            io.emit('entity:merge-entity:done', {
              user: req.user.username,
              id: +form.params.entity_id,
              data: item,
              resource: resource
            });

            res.ok({
              item: item
            }, form.params);
          });
        });

      } else if(form.params.action) {
        Entity.updateRelatedResource(entity, resource, req.user, form.params, function (err, item) {
          if(err)
            return helpers.cypherQueryError(err, res);

          Action.create({
            kind: form.params.action,
            target: Action.APPEARS_IN_RELATIONSHIP,
            mentions: [resource.id, entity.id],
            username: req.user.username
          }, function (err, action) {
            if(err)
              return helpers.cypherQueryError(err, res);

            // add action to response result item
            item.related.action = action;

            io.emit('entity:' + form.params.action + '-related-resource:done', {
              user: req.user.username,
              id: +form.params.entity_id,
              data: item,
              resource: {
                id: +form.params.resource_id
              }
            });

            res.ok({
              item: item
            }, form.params);
          });
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

      // check if it contains a silly annotation....
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      var entity = {id: +form.params.entity_id},
          resource = {id: +form.params.resource_id};

      Entity.createRelatedResource(entity, resource, req.user, form.params, function (err, item) {
        Action.create({
          kind: form.params.annotation? Action.ANNOTATE: Action.CREATE,
          target: Action.APPEARS_IN_RELATIONSHIP,
          mentions: [resource.id, entity.id],
          username: req.user.username,
          annotation: form.params.annotation
        }, function (err, action) {
          if(err)
            return helpers.cypherQueryError(err, res);
          // enrich outputted action with YAML parsed annotation
          if(action.type == Action.ANNOTATE) {
            action.props.annotation = parser.yaml(action.props.annotation);
          }
          // console.log(item)
          // add action to response result item
          item.related.action = action;

          io.emit('entity:create-related-resource:done', {
            user: req.user.username,
            id: +form.params.entity_id,
            data: item,
            resource: resource
          });

          res.ok({
            item: item
          }, form.params);
        });
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
              {
                field: 'mentioning',
                check: 'matches',
                args: [
                  /\d[\d,]+/
                ],
                error: 'mention should contain only numbers and commas'
              },
              {
                field: 'kind',
                check: 'includedIn',
                args: [
                  [
                    Issue.TYPE,
                    Issue.IRRELEVANT,
                    Issue.WRONG,
                    Issue.MERGEABLE
                  ]
                ],
                error: 'wrong value'
              }
            ]
          });
      // console.log(form.params, Issue.KINDS)
      if(!form.isValid)
        return helpers.formError(form.errors, res);

      if(form.params.mentioning) {
        form.params.mentioning = _.map(form.params.mentioning.split(','),  _.parseInt);
      }

      // if form.params.kind == Issue.DATE
      // check that the solution param is an array of valid dates.
      // if form.params.kind == Issue.TYPE
      //   check that the solution param is an available label
      async.series({
        entity: function(next) {
          var params = {
            issue: form.params.kind
          };
          if(form.params.kind == Issue.WRONG)
            params.downvoted_by = req.user.username;
          
          Entity.update(+form.params.id, params, next);
        },
        issue: function(next) {
          Issue.create({
            kind:         form.params.kind,
            solution:     form.params.solution, 
            questioning:  form.params.id,
            mentioning:   form.params.mentioning,
            user:         req.user
          }, next);
        }
      }, function (err, results) {
        var mentions = _.compact([results.issue.id, +form.params.id].concat(form.params.mentioning));

        Action.create({
          kind: Action.RAISE_ISSUE,
          target: form.params.kind == Issue.WRONG? Action.ENTITY_WRONG :Action.ENTITY_LABEL,
          mentions: mentions,
          username: req.user.username
        }, function (err, act) {
          // console.log(err, act)
          if(err)
            return helpers.cypherQueryError(err, res);

          io.emit('entity:create-related-issue:done', {
            user: req.user.username,
            id:  +form.params.id, 
            data: results.issue
          });

          return res.ok({
            item: results.issue,
            action: act
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
            offset: 0,
            orderby: 'relevance'
          }, {
            fields: [
              validator.SPECIALS.orderby
            ]
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);

      var _t = {
          'date': 'res.start_time ASC',
          '-date': 'res.start_time DESC',
          'relevance': undefined // use default value
        },
        orderby = form.params.orderby = _t[''+form.params.orderby]; 
     
      Entity.getRelatedResources(form.params, function (err, items, info) {
        
        if(form.params.limit == 1 && items.length)
          Resource.get({
            id: +items[0].id
          }, req.user, function (err, item) {
            helpers.models.getMany(err, res, [item], info, form.params);
          });
        else
          helpers.models.getMany(err, res, items, info, form.params);
      });
    },
    
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


    getRelatedResourcesTimeline: function(req, res) {
      var form = validator.request(req, {
            limit: 100,
            offset: 0
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      Entity.getRelatedResourcesTimeline({
        id: form.params.id
      }, form.params, function (err, timeline) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          timeline: timeline
        }, {
          params: form.params
        });
      })
    },
    
  }
}