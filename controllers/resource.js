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
    Entity     = require('../models/entity');
    Resource   = require('../models/resource');
    

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
      // get multiple resources if there is a list of resources.
      var ids = helpers.text.toIds(req.params.id);
      // not valid list of ids
      if(ids.length == 0)
        return res.error(404);
      if(ids.length == 1)
        Resource.get({id: req.params.id}, req.user, function (err, item) {
          if(err == helpers.IS_EMPTY)
            return res.error(404);
          if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            item: item
          });
        })
      else
        Resource.getByIds({
          ids: ids
        }, function (err, items) {
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
      get some, based on the limit/offset settings
    */
    getItems: function (req, res) {
      var form = validator.request(req, {
            limit: 50,
            offset: 0,
            orderby: 'date'
          }, {
            fields: [
              validator.SPECIALS.orderby
            ]
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);

      var _t = {
          'date': 'res.start_time ASC',
          'relevance': undefined // use default value
        },
        orderby = form.params.orderby = _t[''+form.params.orderby]; 

      Resource.getMany(form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    },

    /*
      get other max 10 similar resources based on:
      1. co-occurrence presence of the different entities
      2. date proximity
    */
    getRelatedItems: function (req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0,
            orderby: 'relevance'
          }, {
            fields: [
              validator.SPECIALS.orderby
            ]
          });
      
      // validate orderby
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
     
      // if any, rewrite the order by according to this specific context
      var _t = {
          'date': 'res2.start_time ASC',
          '-date': 'result.dst ASC, result.det ASC',
          'relevance': undefined // use default value
        },
        orderby = ''+form.params.orderby; // original orderby we're going to output
      
      
      form.params.orderby = _t[form.params.orderby]
      
      Resource.getRelatedResources(form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, _.assign(form.params, {
          orderby: orderby
        }));
      });
    },
    
    /*
      get all actions related to a resource, with count.
      LIMIT 500
    */
    getRelatedActions: function(req, res) {
      var form = validator.request(req, {
            limit: 150,
            offset: 0
          }, {
            // increment the max limit allowed
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

      // validate orderby
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      Resource.getRelatedActions({
        id: form.params.id,
      },form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    },

    /*
      Add a brand new entity to the requested resource
    */
    createRelatedEntity: function(req, res){
      var fields = validator.getEntityFields(req.params.entity),
          required = _.assign({name: ''}, _.zipObject(_.map(fields, 'field'), ' ')),
          form = validator.request(req, required, {
            fields: fields
          });

      if(!form.isValid)
        return helpers.formError(form.errors, res);
      // console.log('createRelatedEntity', form.isValid)
      var resource = {
            id: form.params.id
          };
      // check that no entity exist already, with waterfall
      async.waterfall([
        /*
          Check that we do not create a new entity
          (same entity type plus [slug | viaf number | wiki)
        */
        function check(next) {
          Entity.check(_.assign({ resource_id: resource.id}, form.params, {
            type: form.params.entity
          }), next);
        },
        /*
          if check returns an empty result set, we will create the entity
        */
        function createIfNotFound(results, next) {
          if(results.length > 0)
            next(null, _.assign({
              entityExists: true
            }, results[0]));
          else
            Entity.create(_.assign({}, form.params, {
              resource: {
                id: form.params.id
              },
              type: form.params.entity,
              name: form.params.name,
              username: req.user.username
            }), next);
        },
        /*
          if the antity has been created, let's add an action to store that specific info.
        */
        function createActionIfBrandNewEntity(entity, next) {
          if(entity.entityExists) {
            if(!entity.rel) {
              // console.log("rel need to be created");
              Entity.createRelatedResource(entity, resource, req.user, {}, function (err, item) {
                next(err, item)
              });
            } else {
              next(null, entity);
            }
          } else { // entity has been created
            // console.log("entity has been created");
            Action.create({
              kind: Action.CREATE,
              target: Action.BRAND_NEW_ENTITY,
              mentions: [
                resource.id,
                entity.id
              ],
              username: req.user.username
            }, function (err, action) {
              if(action)
                _.assign(entity, {
                  related: {
                    action: action
                  }
                });
              // console.log("entity has been created", entity);
              next(err, entity);
            });
          }
        }
      ], function (err, entity) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          item: entity
        }, form.params);
      });
    },
    /*
      Get top related persons
      get the most important entities per type
    */
    getRelatedEntities: function (req, res) {
      var form = validator.request(req, {
            limit: 50,
            offset: 0
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
     
      Resource.getRelatedEntities(form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    },
    
    /*
      Get monopartite graph of related resource network
    */
    getRelatedEntitiesGraph: function (req, res) {
      var form = validator.request(req, {
            limit: 100,
            offset: 0
          },{
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
      
      Resource.getRelatedEntitiesGraph({
        id: form.params.id,
        entity: form.params.entity,
        limit: form.params.limit,
        offset: form.params.offset
      }, function (err, graph) {
        return res.ok({
          graph: graph
        }, {
          model:  form.params.entity
        });
      });
    },
    
    /**
      We should move this to entities instead.
    */
    getCooccurrences: function (req, res) {
      var query = '',
          form = validator.request(req, {
            limit: 200,
            offset: 0
          },{
            // increment the min
            fields: [
              {
                field: 'limit',
                check: 'isInt',
                args: [
                  {min: 1, max: 500}
                ],
                error: 'should be a number in range 1 to max 200'
              }
            ],
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      form.params.entity = form.params.entityA; // if it is necessary,e.g. for precomputated routes

      
      if((form.params.entityA == 'person' || form.params.entityA == 'theme') && form.params.entityA == form.params.entityB && !form.params.from && !form.params.to && !form.params.with && !form.params.type) {
        query = parser.agentBrown(queries.get_precomputated_cooccurrences, form.params);
        form.params.precomputated = true;
      } else {

        query = parser.agentBrown(form.params.entityA == form.params.entityB? queries.get_cooccurrences: queries.get_bipartite_cooccurrences, form.params);
      }
      helpers.cypherGraph(query, form.params, function (err, graph) {
        if(err) {
          return helpers.cypherQueryError(err, res);
        };
        return res.ok({
          graph: graph
        },form.params);
      });
    },
    
    /*
      create a new inquiry on this resource
    */
    createInquiry: function (req, res) {
      var inquiry   = require('../models/inquiry'), 
          form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      inquiry.create({
        name: form.params.name,
        description: form.params.description,
        doi: +form.params.id,
        user: req.user
      }, function (err, inquiry) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('done:create_inquiry', {
          user: req.user.username,
          doi: +req.params.id, 
          data: inquiry
        });
        return res.ok({
          item: inquiry
        });
      })
    },
    /*
      return the list of related inquiries
    */
    getRelatedInquiry: function(req, res) {
      var inquiry   = require('../models/inquiry'), 
          form = validator.request(req, {
            limit: 20,
            offset: 0
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      inquiry.getMany({
        resource_id: +form.params.id,
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
      return the list of related issues
    */
    getRelatedIssue: function(req, res) {
      var Issue   = require('../models/issue'), 
          form = validator.request(req, {
            limit: 20,
            offset: 0
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      Issue.getMany({
        resource_id: form.params.id,
        type:        form.params.type,
        limit:       form.params.limit,
        offset:      form.params.offset
      }, function (err, items, info) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          items: items
        }, info);
      })
    },
    /*
      create a new issue for this resource
    */
    createIssue: function (req, res) {
      var Issue   = require('../models/issue'), 
          form = validator.request(req, {}, {
            fields: [
              validator.SPECIALS.issueType
            ]
          });
      // console.log(form.params)
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      // if form.params.type == Issue.DATE
      // check that the solution is an array of valid dates.
      Issue.create({
        type:         form.params.type,
        title:        form.params.title,
        language:     form.params.language || 'en',
        description:  form.params.description,
        solution:     form.params.solution, 
        doi:          form.params.id,
        user:         req.user
      }, function (err, issue) {
        if(err)
          return helpers.cypherQueryError(err, res);
        
        io.emit('resource:create-related-issue:done', {
          user: req.user.username,
          id:  +form.params.id, 
          data: issue
        });
        return res.ok({
          item: issue
        });
      });
    },
    /*
      create a comment on this resource
    */
    createComment: function(req, res) {
      //console.log('ici', req.body.content, req.user);
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
        //console.log(err, items);
        if(err)
          return helpers.cypherQueryError(err, res);
        // emit the event for those connected on resource. to be refactored.
        io.emit('resource:create-related-comment:done', {
          user: req.user.username,
          id: +req.params.id, 
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
      if(req.query.graphtype) {
        if(['monopartite-entity', 'monopartite-resource'].indexOf(req.query.type) == -1) {
          return res.error({type: req.query.graphtype + 'not found'});
        }
        type = req.query.graphtype
      }
      
      if(type == 'bipartite') {
        Resource.getGraphPersons(req.params.id, {}, function (err, graph) {
           if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            graph: graph
          }, {
            type: type
          });
        });
      } else if(type == 'monopartite-entity') {
        Resource.getGraphPersons(req.params.id, {}, function (err, graph) {
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
      Get monopartite graph of related resource network
    */
    getRelatedResourcesGraph: function (req, res) {
      var form = validator.request(req, {
            limit: 100,
            offset: 0
          });

      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      // console.log(form)
      Resource.getRelatedResourcesGraph({
        id: form.params.id
      },
      {
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
    
    getTimeline: function (req, res) {
      var form = validator.request(req, {
            limit: 100,
            offset: 0
          });

      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      Resource.getTimeline(form.params, function (err, timeline) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          timeline: timeline
        }, {
          params: form.params
        });
      });
    },
    
    getRelatedResourcesTimeline: function (req, res) {
      var form = validator.request(req, {
            limit: 100,
            offset: 0
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      Resource.getRelatedResourcesTimeline({
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
    
    /*
      Create a LIKES relationship bzetween the current user and the resoruce
    */
    createRelatedUser: function (req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      async.parallel({
        resource: function(next) {  
          Resource.createRelatedUser({
            id: form.params.id
          }, req.user, next);
        }, 
        action: function(next) {
          Action.create({
            kind: Action.CREATE,
            target: Action.LIKES_RELATIONSHIP,
            mentions: [form.params.id],
            username: req.user.username
          }, next);
        }
      }, function (err, results) {
        if(err)
          return helpers.cypherQueryError(err, res);
        // attach the likes action
        _.assign(results.resource, {
          related: {
            action: results.action
          }
        });
        
        io.emit('resource:create-related-user:done', {
          user: req.user.username,
          id:   form.params.id, 
          data: results.resource
        });
        return res.ok({
          item: results.resource
        });
      })
    },
    
    removeRelatedUser:function (req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);

      Resource.removeRelatedUser({
        id: form.params.id
      }, req.user, function (err, resource) {
        io.emit('resource:remove-related-user:done', {
          user: req.user.username,
          id:   form.params.id, 
          data: resource
        });
        return res.ok({}); // nothing more...
      });
    },
    /*
      Get the users related to the resource (relationship: [:curates])
    */
    getRelatedUsers: function (req, res) {
      var form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      Resource.getRelatedUsers({
        id: form.params.id
      }, form.params, function (err, items, info) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({items: items}, info);
      })
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