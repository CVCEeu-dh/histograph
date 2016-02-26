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
    
/*
  helper: form for related issues, cfr. blow createRelatedissue and RemoveRelatedIssue
*/
var __solutions = {};

__solutions[Action.ISSUE_CHECK_TYPE] = {
  field: 'solution',
  check: 'includedIn',
  args: [
    settings.types.entity
  ],
  error: 'wrong value for solution'
};

__solutions[Action.ISSUE_CHECK_CAN_MERGE] = {
  field: 'solution',
  check: 'matches',
  args: [
    /\d[\d,]+/
  ],
  error: 'wrong value for solution'
};

function _relatedIssueForm(req) {
  var form = validator.request(req, { kind: ''}, {
        fields: _.compact([
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
                Action.ISSUE_CHECK_TYPE,
                Action.ISSUE_CHECK_CAN_MERGE,
                Action.ISSUE_CHECK_IS_IRRELEVANT,
                Action.ISSUE_CHECK_IS_WRONG
              ]
            ],
            error: 'wrong value'
          },
          __solutions[req.body.kind]
        ])
      });

  return form;
};


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

      api: api/entity/:entity_id(\\d+)/related/resource/:resource_id(\\d)+/:action(upvote|downvote|merge)
      
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

      var entity = {id: form.params.entity_id},
          resource = {id: form.params.resource_id};
      // console.log('updateRelatedResource', form.params)
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
          // console.log('UPDATED', err)
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
              id: form.params.entity_id,
              data: item,
              resource: {
                id: form.params.resource_id
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
      
      var entity = {id: form.params.entity_id},
          resource = {id: form.params.resource_id};
      Entity.createRelatedResource(entity, resource, req.user, form.params, function (err, item) {
        if(err)
            return helpers.cypherQueryError(err, res);
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
            id: form.params.entity_id,
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
        id: form.params.entity_id
      },
      {
        id: form.params.resource_id
      },
      req.user,
      form.params, function (err, item) {
        if(err)
          return helpers.cypherQueryError(err, res);

        io.emit('entity:remove-related-resource:done', {
          user: req.user.username,
          id: form.params.entity_id,
          data: item,
          resource: {
            id: form.params.resource_id
          }
        });

        return res.ok({item: item}, form.params);
      });
    },

    /*
      Create a node (action:issued), optionally providing a solution.
      Cfr models.issue
    
      create a new issue for this entity
      use cases.

      1)  with request param
          ```if req.query.kind ==  Action.ISSUE_CHECK_TYPE```
          one can raise the issue that the 'label' for that entity is not correct.
          Then, 
          ```req.query.solution = 'correct label'```
      
      2)  with request param
          ```if req.query.kind == Action.ISSUE_CHECK_IS_IRRELEVANT```
          one can raise the issue that the entity is a dumb error.
          No solution should be provided for this issue.

      3)  with request param
          ```if req.query.kind == Action.ISSUE_CHECK_CAN_MERGE```
          one can raise the issue that the entity can be merged with another entity.
          Then,
          ```req.query.solution = <merge-to-entity-id>```

      
    */
    
    createRelatedIssue: function (req, res) {
      var form = _relatedIssueForm(req);

      if(!form.isValid)
        return helpers.formError(form.errors, res);

      if(form.params.mentioning) {
        form.params.mentioning = form.params.mentioning.split(',');
      }
      // for merge options, mentions both trsuted and untrusted
      if(form.params.kind == Action.ISSUE_CHECK_CAN_MERGE)
        form.params.mentioning = (form.params.mentioning||[]).concat([form.params.solution]);

      // if solution is an ID
      if(!isNaN(form.params.solution))
        form.params.solution = parseInt(form.params.solution);
      
      async.series([
        function action(next) {
          Action.merge({
            kind: Action.RAISE_ISSUE,
            focus: form.params.id,
            solution: _.keys(__solutions).indexOf(form.params.kind) == -1? '': form.params.solution, // solution has been checked for the types on the left
            target: Action.getTargetByIssue(form.params.kind),
            mentions: [form.params.id].concat(form.params.mentioning || []),
            username: req.user.username
          }, next);
        },
        // action has created the link btw the user and the entity. we then update the entity in order to recalculate links
        function entity(next) {
          var params = {
            issue: form.params.kind
          };
          // downvte only if the type is explicit ly set as sWRONG
          if(form.params.kind == Action.ISSUE_CHECK_IS_WRONG)
            params.downvoted_by = req.user.username;
          
          params.issue_upvoted_by = req.user.username;
          
          Entity.update({
            id: form.params.id
          }, params, next);
        }
      ], function (err, results) {
        if(err)
          return helpers.cypherQueryError(err, res);
        var item = _.assign({
            related:{
              action: results[0]
            }
          }, results[1]);

        io.emit('entity:create-related-issue:done', {
          user: req.user.username,
          id:  form.params.id, 
          data: item
        });

        return res.ok({
          item: item
        }, form.params);
        
      });
    },

    /*
      Remove or ask for removal.
      If the issue has no other upvotes/downvotes than the current auth user,
      the issue is then removed from the entity. 
    */
    removeRelatedIssue: function (req, res) {
      var form = _relatedIssueForm(req);

      if(!form.isValid)
        return helpers.formError(form.errors, res);

      if(form.params.mentioning) {
        form.params.mentioning = _.map(form.params.mentioning.split(','),  _.parseInt);
      }

      // if solution is an ID
      if(!isNaN(form.params.solution))
        form.params.solution = parseInt(form.params.solution);
      
      // for merge options, mentions both trsuted and untrusted
      if(form.params.kind == Action.ISSUE_CHECK_CAN_MERGE)
        form.params.mentioning = (form.params.mentioning||[]).concat([+form.params.solution]);

      // downvte only if the type is explicit ly set as sWRONG
      if(form.params.kind == Action.ISSUE_CHECK_IS_WRONG)
        params.upvoted_by = req.user.username;


      async.series([
        function action(next) {
          Action.merge({
            kind: Action.RAISE_ISSUE,
            focus: form.params.id,
            solution: _.keys(__solutions).indexOf(form.params.kind) == -1? '': form.params.solution, // solution has been checked for the types on the left
            target: Action.getTargetByIssue(form.params.kind),
            mentions: [form.params.id].concat(form.params.mentioning || []),
            username: req.user.username,
            downvoted_by: req.user.username
          }, next);
        },
        function entity(next) {
          var params = {
            issue: form.params.kind
          };
          // UPVOTE if we want to remove the issue WRONG: ebntity score will be updated accordingly, cfr Entity.update()
          if(form.params.kind == Action.ISSUE_CHECK_IS_WRONG)
            params.upvoted_by = req.user.username;
          
          params.issue_downvoted_by = req.user.username;
          
          Entity.update({
            id: form.params.id
          }, params, next);
        }
      ], function (err, results) {
        if(err)
          return helpers.cypherQueryError(err, res);

        var item = _.assign({
            related:{
              action: results[0]
            }
          }, results[1]);

        io.emit('entity:remove-related-issue:done', {
          user: req.user.username,
          id:  form.params.id, 
          data: item
        });

        return res.ok({
          item: item
        }, form.params);
        
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
      Entity.update({
        id: form.params.id
      }, {
        upvoted_by: req.user.username
      }, function (err, ent) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('entity:upvote:done', {
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
      Entity.update({
        id: form.params.id
      }, {
        downvoted_by: req.user.username
      }, function (err, ent) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('entity:downvote:done', {
          user: req.user.username,
          doi: req.params.id, 
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
            id: items[0].id
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