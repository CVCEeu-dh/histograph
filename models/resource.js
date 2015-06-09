/**
 * Resource Model for documents, video etc...
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    parser    = require('../parser.js'),
    neo4j     = require('seraph')(settings.neo4j.host),
    
    rQueries  = require('decypher')('./queries/resource.cyp'),
    vQueries  = require('decypher')('./queries/version.cyp'),
    
    async     = require('async'),
    YAML      = require('yamljs'),
    _         = require('lodash');


var Resource = function() {
  this.id; 
  this.source;
  this.date;
  this.languages = [];
  this.start_date;
  this.end_date;
  this.start_time;
  this.end_time;
  
  this.title_search;
  this.caption_search;
  
  this.positionings = [];
  this.annotations = [];
  this.places = [];
  this.locations = [];
  this.persons = [];
  this.comments = [];
  this.collections = [];
};


module.exports = {
  /**
    get a complete resource object (with versions, comments etc...).
    @param id - numeric identifier only
   */
  get: function(id, next) {
    neo4j.query(rQueries.get_resource, {
      id: +id
    }, function(err, items) {
      
      if(err) {
        console.log(err.neo4jError)
        next(err);
        return
      }
      if(items.length == 0) {
        next(helpers.IS_EMPTY);
        return;
      }
      var item = items[0].resource;
      
      // yaml parsing
      item.positionings = _.map(_.values(item.positionings), function (d) {
        if(d.yaml)
          d.yaml = YAML.parse(d.yaml);
        return d;
      });
      
      // yaml parsing and annotation
      item.annotations = _.map(_.filter(_.values(item.annotations), function(d) {
        return d.yaml && d.yaml.length > 0
      }), function (d) {
        if(d.yaml)
          d.yaml = YAML.parse(d.yaml);
        
        var content = [
          item.props['title_'+ d.language] || '',
          item.props['caption_'+ d.language] || ''
        ].join('§ ');
        
        if(!d.yaml.length){
          return d;
        }
        var annotations = parser.annotate(content, d.yaml).split('§ ');
        
        d.annotated = {
          title: annotations[0],
          source: annotations[1]
        };
        return d;
      });
      
      item.places = _.values(item.places);  
      item.locations = _.values(item.locations);
      item.persons = _.values(item.persons);
      item.comments = _.values(item.comments);
      item.collections = _.values(item.collections);

      next(null, item);
    });  
  },
  /*
    Provide here a list of valid ids
  */
  getByIds: function(ids, next) {
    neo4j.query(rQueries.get_resources_by_ids, {
        ids: ids,
        limit: ids.length,
        offset: 0
    }, function (err, items) {
      if(err) {
        console.log(err.neo4jError)
        next(err);
        return;
      }
      if(items.length == 0) {
        next(helpers.IS_EMPTY);
        return;
      }
      next(null, _.map(items, function (item) {
        item.places = _.values(item.places); 
        item.locations = _.values(item.locations); 
        item.persons = _.values(item.persons); 
        return item;
      }));
    });
  },
  
  search: function(options, next) {
    // at least options.search should be given.
    // note that if there is a solr endpoint, this endpoint should be used.
    // you can retrieve later the actual resources by doi.
  },
  /*
    Create a Resource item.
    Some properties are compulsory.
    @return (err, resource:Resource)
  */
  create: function(properties, next) {

  },
  
  update: function(id, properties, next) {

  },
  /*
    Change the resoruce label to :trash in order to manually
    @return (err, resource:Resource)
  */
  remove: function(id, next) {
    
  },
  /**
    Monopartite graph
  */
  getGraphPersons: function(id, properties, next) {
    var options = _.merge({
      id: +id, 
      limit: 100
    }, properties);
    
    helpers.cypherGraph(rQueries.get_graph_persons, options, function (err, graph) {
      if(err) {
        next(err);
        return
      };
      next(null, graph);
    });
  },
  /*
    The long chain of the discovery.
    Perform TEXTRAZOR on some field of our darling resource and 
    GEOCODE/GEONAMES for the found PLACES entities
  */
  discover: function(id, next) {
    // quetly does textrazor entity extraction.
    neo4j.read(id, function(err, res) {
      if(err) {
        next(err);
        return;
      }
      // should specify the different languages.
      if(res.languages && res.languages.length) {
        var q = async.queue(function (language, nextLanguage) {
          var content = [
            res['title_'+ language] || '',
            res['caption_'+ language] || ''
          ].join('. ');
          
          if(content.length < 10) { // not enough content
            console.log('not enough content, skipping', res)
            nextLanguage();
            return;
          };
          
          // waterfall
          
          
          helpers.yagoaida(content, function (err, entities) {
            if(err)
              throw err;
            console.log('helpers.yagoaid entities ', entities.length);
            var yaml = [];
            // save the resource-entities relationship and prepare the annotation
            var _q = async.queue(function (entity, nextEntity) {
              yaml.push({
                id: entity.id, // local entity id, or uri?
                context: entity.context
              });
              helpers.enrichResource(res, entity, function (err, next) {
                if(err)
                  throw err;
                nextEntity();
              });
            }, 2);
            
            _q.push(entities);
            _q.drain = function() {
              var now = helpers.now(),
                  persons = entities.filter(function (d) {
                    return (!d.geocode_id && !d.geonames_id)
                  });
              // add the proper version according to the language
              neo4j.query(vQueries.merge_version_from_service, {
                resource_id: res.id,
                service: 'yagoaida',
                unknowns: persons.length,
                persons: persons.length,
                creation_date: now.date,
                creation_time: now.time,
                language: language,
                yaml: YAML.stringify(yaml, 2)
              }, function (err, nodes) {
                // console.log(err, vQueries.merge_version_from_service)
                if(err)
                  throw err;
                // merge the version and the res
                neo4j.query(vQueries.merge_relationship_version_resource, {
                  version_id: nodes[0].id,
                  resource_id: res.id
                }, function (err, nodes) {
                  if(err)
                    throw err;
                  console.log('  res #id',res.id,' saved, #ver_id', nodes[0].ver.id, 'res_url:', nodes[0].res.url);
                  // out
                  nextLanguage();
                });
              }); // eof vQueries.merge_version_from_service
            }; // eof drain async
          });
          // console.log('textrazor')
          /*
          helpers.textrazor(content, function(err, entities) {
            if(err == helpers.IS_LIMIT_REACHED) {
              console.log('daily limit reached')
              // daily limit has been reached
              q.kill();
              next()
              return;
            }
            
            if(err)
              throw err;
            
            var yaml = [];
            // save the resource-entities relationship and prepare the annotation
            var _q = async.queue(function (entity, nextEntity) {
              yaml.push({
                id: entity.id, // local entity id, or uri?
                context: entity.context
              });
              helpers.enrichResource(res, entity, function(err, next) {
                if(err)
                  throw err;
                nextEntity();
              });
            }, 2);
            
            _q.push(entities);
            _q.drain = function() {
              var now = helpers.now(),
                  persons = entities.filter(function (d) {
                    return (!d.geocode_id && !d.geonames_id)
                  });
              // add the proper version according to the language
              neo4j.query(vQueries.merge_version_from_service, {
                resource_id: res.id,
                service: 'textrazor',
                unknowns: persons.length,
                persons: persons.length,
                creation_date: now.date,
                creation_time: now.time,
                language: language,
                yaml: YAML.stringify(yaml, 2)
              }, function (err, nodes) {
                console.log(err, vQueries.merge_version_from_service)
                if(err)
                  throw err;
                // merge the version and the res
                neo4j.query(vQueries.merge_relationship_version_resource, {
                  version_id: nodes[0].id,
                  resource_id: res.id
                }, function (err, nodes) {
                  if(err)
                    throw err;
                  console.log('  res #id',res.id,' saved, #ver_id', nodes[0].ver.id, 'res_url:', nodes[0].res.url);
                  // out
                  nextLanguage();
                });
              }); // eof vQueries.merge_version_from_service
            }; // eof drain async
          });
          */
        },1);
        q.push(res.languages);
        q.drain = function() {
          next(null, res);
        }
      }
    });
    //helpers.
  }
}