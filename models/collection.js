/**
 * Model for Collection
 * ====================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    parser    = require('../parser.js'),
    neo4j     = require('seraph')(settings.neo4j.host),
    
    queries   = require('decypher')('./queries/collection.cyp'),

    async     = require('async'),
    _         = require('lodash');


module.exports = {
  /**
    create/merge a collection (UNIQUE: slug, username)
    Requires: name, description, user
  */
  create: function(properties, next) {
    var now = helpers.now();
    neo4j.query(queries.merge_collection, {
      slug: helpers.text.slugify(properties.name),
      name: properties.name,
      description: properties.description,
      language: helpers.text.language([properties.name, properties.description].join('. ')),
      creation_date: now.date,
      creation_time: now.time,
      username: properties.user.username
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      if(!node.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      next(null, node[0]);
    })
    
  },
  /**
    get a complete resource object (with versions, comments etc...).
    @param language - 'en' or 'fr' or other two chars language identifier 
   */
  get: function(id, next) {
    neo4j.query(queries.get_collection, {id: id}, function (err, items) {
      if(err) {
        next(err);
        return
      }
      if(!items.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      var item = items[0];
      
      next(null, item);
    });  
  },
  /*
    possible properties: limit, offset
  */
  getItems: function(properties, next) {
    neo4j.query(queries.get_collections, properties, function (err, items) {
      if(err) {
        next(err);
        return
      }
      next(null, items);
    });  
  },
  /*
    According to the given label
  */
  getRelatedResources: function(id, properties, next) {
    var options = _.merge({
      id: id,
      offset: 0,
      limit: 10
    }, properties);

    neo4j.query(queries.get_related_resources, options, function (err, items) {
      if(err) {
        next(err);
        return
      }
      next(null, items.map(function (d) {
        d.locations = _.values(d.locations || {});
        d.person    = _.values(d.persons || {});
        d.place     = _.values(d.places || {});
        return d;
      }));
    });  
  },
  
  getGraph: function (id, properties, next) {
    var options = _.merge({
      id: id,
      offset: 0,
      limit: 10
    }, properties);
    
    neo4j.query(queries.get_collection_graph, options, function (err, items) {
      if(err) {
        next(err);
        return
      }
      
      var graph = {
        nodes: [],
        edges: []
      };
      var index = {};
      
      for(var i = 0; i < items.length; i++) {
        graph.nodes.push(items[i].res);
        for(var j in items[i].per ) {
          if(!index[items[i].per[j].id]) {
            index[items[i].per[j].id] = items[i].per[j];
            index[items[i].per[j].id].type = 'person';
            graph.nodes.push( items[i].per[j])
          }
          graph.edges.push({
            id: items[i].res.id+'.'+items[i].per[j].id,
            source: items[i].res.id,
            target: items[i].per[j].id,
            color: "#a3a3a3"
          })
        }
      }
      next(null, graph)
    })
  },
  getRelatedItems: function(id, properties, next) {
    neo4j.query(queries.get_related_items, {
      id: id,
      offset: properties.offset,
      limit: properties.limit
    }, function (err, items) {
      if(err) {
        next(err);
        return
      }
      
      next(null, _.map(items, function (d) {
        d.persons = _.values(d.persons);
        d.places  = _.values(d.places);
        d.props.languages = _.values(d.props.languages);
        return d;
      }))
    })
  },
  
  /*
    add new item to the collection. note that this function can
    also be used to manipulate existing sorting order.
    require: properties.ids, properties.slug and properties.user
  */
  addRelatedItems: function (properties, next) {
    neo4j.query(queries.merge_collection_items, {
      ids: properties.ids,
      slug: properties.slug,
      username: properties.user.username
    }, function (err, nodes) {
      if(err)
        next(err);
      else
        next(null, nodes[0]);
    })
  },
    
  /*
    This method MUST NOT HAVE a public http API access.
    Use a bin function instead.
    Remove the collection permanently.
  */
  remove: function(id, next) {
    neo4j.query(queries.remove_collection, {
      id: +id
    }, function (err) {
      if(err)
        next(err);
      else
        next();
    })
  }
};