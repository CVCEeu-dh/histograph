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
    
    fs        = require('fs'),
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
      var versions = _.map(_.filter(_.values(item.versions),function(d) {
        //filter
        return d.yaml && d.yaml.length > 0
      }), function (d) {
        //map
        if(d.yaml)
          d.yaml = YAML.parse(d.yaml);
        return d;
      });
      
      item.positionings = _.filter(versions, {type:'positioning'});
      item.annotations = _.map(_.filter(versions, {type:'annotation'}), function (d) {
        var content = [
          item.props['title_'+ d.language] || '',
          item.props['caption_'+ d.language] || ''
        ].join('§ ');
        
        var annotations = parser.annotate(content, d.yaml).split('§ ');
        
        d.annotated = {
          title: annotations[0],
          source: annotations[1]
        };
        return d;
      });
      var entitites = _.values(item.entities);
      item.places = _.filter(entitites, {type: 'place'});  
      item.locations = _.filter(entitites, {type: 'location'});
      item.persons = _.filter(entitites, {type: 'person'});
      item.collections = _.values(item.collections);

      next(null, item);
    });  
  },
  /*
    Available params are limit, offset, order by.
  */
  getMany: function(params, next) {
    async.parallel({
      totalItems: function(callback) {
        var query = parser.agentBrown(rQueries.count_resources, params);
        neo4j.query(query, params, function (err, result) {
          if(err)
            console.log(err)
          if(err)
            callback(err);
          else
            callback(null, result.total_items);
        });
      },
      items: function(callback) {
        var query = parser.agentBrown(rQueries.get_resources, params);
        neo4j.query(query, params, function (err, items) {
          if(err)
            callback(err)
          else
            callback(null, items.map(function (d) {
              d.locations = _.values(d.locations || {});
              d.persons   = _.values(d.persons || {});
              d.places    = _.values(d.places || {});
              return d;
            }));
        })
      }
    }, function (err, results) {
      // results is now equals to: {one: 1, two: 2}
      if(err) {
        next(err);
        return;
      }
      next(null, results.items, {
        total_items: results.totalItems
      })
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
    var now = helpers.now(),
        query = parser.agentBrown(rQueries.merge_resource, {
          languages: properties.languages
        });
    
    neo4j.query(query, _.assign(properties, {
      creation_date: now.date,
      creation_time: now.time,
      username: properties.user.username
    }), function (err, node) {
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
  
  /*
    Create a relationships with an entity. If the entity dioes not exist, it will create it.
    Entity object MUST contain at least: name and type.
  */
  createRelatedEntity: function(resource, entity, next) {
    var Entity = require('../models/entity');
    Entity.create(_.assign(entity, {
      resource: resource
    }), function (err, entity) {
      if(err) {
        next(err);
        return;
      }
      next(null, entity);
    });
  },  
  
  update: function(id, properties, next) {

  },
  /*
    Change the resoruce label to :trash in order to manually
    @return (err, resource:Resource)
  */
  remove: function(doi, next) {
    neo4j.query(rQueries.remove_resource, {
      doi: doi
    }, function(err) {
      if(err)
        next(err);
      else
        next();
    });
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
  
  /**
    Timeline
  */
  getTimeline: function (properties, next) {
    helpers.cypherTimeline(rQueries.get_timeline, properties, function (err, timeline) {
      if(err)
        next(err);
      else
        next(null, timeline);
    });
  },
  
  getRelatedResources: function (properties, next) {
    async.parallel({
      totalItems: function(callback){
        neo4j.query(rQueries.count_similar_resource_ids_by_entities,  {
          id: +properties.id
        }, function (err, result) {
          if(err)
            callback(err);
          else
            callback(null, result.total_items);
        });
      },
      ids: function(callback){
        neo4j.query(rQueries.get_similar_resource_ids_by_entities, {
          id: +properties.id,
          limit: +properties.limit,
          offset: +properties.offset
        }, function (err, ids) {
          if(err)
            callback(err)
          else
            callback(null, _.compact(_.map(ids, 'id')));
        })
      }
    }, function (err, results) {
      // results is now equals to: {one: 1, two: 2}
      if(err) {
        next(err);
        return;
      }
      
      neo4j.query(rQueries.get_resources_by_ids, {
        ids: results.ids,
        limit: results.ids.length,
        offset: 0
      }, function (err, items) {
        if(err) {
          next(err);
          return;
        }
        var hItems = _.indexBy(items, 'id');
        next(null, _.map(results.ids, function (d) {
          hItems[''+d].persons = _.values(hItems[''+d].persons);
          return hItems[d]
        }),{
          total_items: results.totalItems
        });
      });
    }); 
    
  },
  
  /*
    The long chain of the discovery.
    Perform TEXTRAZOR on some field of our darling resource and 
    GEOCODE/GEONAMES for the found PLACES entities
  */
  discover: function(resource, next) {
    var entities = [],
        ISO3     = {
          'en': 'eng',
          'fr': 'fra'
        };
    
    neo4j.read(resource.id, function (err, res) {
      if(err) {
        next(err);
        return;
      }
      /*
        1. discover language if no one has been specified, from name and (generic) caption
      */
      if(!res.languages && _.compact([res.name, res.source, res.caption]).length) {
        var Langdetect = require('languagedetect'),
            langdetect = new Langdetect('iso2'),
            languages = langdetect.detect(_.compact([res.name, res.source, res.caption]).join('. ')),
            language = languages.length? _.first(_.first(languages)) : 'en';
        res.languages = [language];
        res['title_'+language] =  res.name;
        res['caption_'+language] =  res.source;
      }
      /*
        If there is no language at all, clean up.        
      */
      if(!res.languages || !res.languages.length) {
        console.log('models.discover: no language found...', res);
        next(helpers.IS_EMPTY);
        return;
      }
      /*
        2. queue: for each language, get the results from yago (EN) and textrazor (EN / FR)
      */
      var q = async.queue(function (language, nextLanguage) {
        var filename = 'contents/resource_' + res.doi + '_discover__'+ language + '.json',
            content = [
              res['title_'+ language] || '',
              res['caption_'+ language] || ''
            ].join('. '); // content string, by language is the concatenation of tuitles and captions
          
        // console.log('  language: ', language, content, filename);
        // check if it has already been discovered
        if(fs.existsSync(filename)) {
          var contents = require('../'+filename);
          entities = entities.concat(contents.yago, contents.textrazor)
          nextLanguage();
          return;
        }
          
        async.parallel({
          /*
            1. textrazor (support other languages than english)
          */
          textrazor: function(callback) {
            // if textrazor is abilitated
            if(!settings.textrazor)
              return callback(null, []);

            console.log('calling textrazor...', language)
            helpers.textrazor({
              text: content,
              cleanup_use_metadata: true,
              // languageOverride: ISO3[language]
            }, function (err, _entities) {
              console.log(' textrazor answered')
              if(err)
                return callback(err);
              entities = entities.concat(_entities.map(function (d) {
                d.context.language = language;
              }));
              callback(null, _entities);
            });
          },
          /*
            2. yago (with disambiguation engine, english only)
          */
          yago: function(callback) {
            if(language != 'en')
              return callback(null, []);
            console.log('calling yago...')
            helpers.yagoaida({
              text: content
            }, function (err, _entities) {
              console.log(' yago answered')
              if(err)
                return callback(err);
              entities = entities.concat(_entities.map(function (d) {
                d.context.language = language;
              }));
              callback(null, _entities);
            })
          }  
        }, function (err, results) {
          if(err)
            console.log(err);
          else
            console.log('response: ',results)
          // write to cache, dev only
          fs.writeFileSync(filename, JSON.stringify(results, null, 2))
          
          nextLanguage();
          //console;log(results)
        });
        
      }, 1);
      q.push(res.languages);
      q.drain = function() {
        console.log('entities', entities.length);
        // calculate thrustwortness (for the links)
        helpers.align(entities, function (err, entities) {
          // then save entity and relationships, per language
          
          next(null, entities);
        });
        // next(null, entities);
      };
      
      
      
      
      
      return;
      
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
      
    });
    //helpers.
  }
}