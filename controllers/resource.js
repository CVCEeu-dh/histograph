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
      // get multiple resources if there is a list of resources.
      var ids = helpers.text.toIds(req.params.id);
      // not valid list of ids
      if(ids.length == 0)
        return res.error(404);
      if(ids.length == 1)
        resource.get(req.params.id, function (err, item) {
          if(err == helpers.IS_EMPTY)
            return res.error(404);
          if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            item: item
          });
        })
      else
        resource.getByIds({
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
            offset: 0
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);

      resource.getMany(form.params, function (err, items, info) {
        return helpers.models.getMany(err, res, items, {
          params: form.params,
          total_items: info.total_items
        });
      });
    },

    /*
      get other max 10 similar resources based on:
      1. co-occurrence presence of the different entities
      2. date proximity
    */
    getRelatedItems: function (req, res) {
      var form = validator.request(req, {
            limit: 50,
            offset: 0
          });
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      // get the total available
      console.log(form.params)
      resource.getRelatedResources(form.params, function (err, items, info) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({items: items}, info);
      });
    },
    
    /**
      We should move this to entities instead.
    */
    getCooccurrences: function (req, res) {
      validator.queryParams(req.query, function (err, params, warnings) {
        if(err)
          return helpers.formError(err, res);
        var query = parser.agentBrown(queries.get_cooccurrences, params);
        // console.log('query', query)
        
        helpers.cypherGraph(query, {
          offset: 0,
          limit: 500,
          start_time: params.start_time,
          end_time: params.end_time
        }, function (err, graph) {
          if(err) {
            return helpers.cypherQueryError(err, res);
          };
          return res.ok({
            graph: graph
          });
        });
      })
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
          form = validator.request(req);
      
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      Issue.create({
        type:        form.params.type,
        solution:    form.params.solution,
        description: form.params.description,
        doi:         form.params.id,
        user:        req.user
      }, function (err, issue) {
        if(err)
          return helpers.cypherQueryError(err, res);
        io.emit('resource:issue:created', {
          user: req.user.username,
          doi: +req.params.id, 
          data: issue
        });
        return res.ok({
          item: issue
        });
      })
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
    
    getTimeline: function (req, res) {
      validator.queryParams(req.query, function (err, params, warnings) {
        if(err)
          return helpers.formError(err, res);
        
        resource.getTimeline(params, function (err, timeline) {
          if(err)
            return helpers.cypherQueryError(err, res);
          return res.ok({
            timeline: timeline
          }, {
            params: params,
            warnings: warnings
          });
        });
      });
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