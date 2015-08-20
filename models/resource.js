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
  
  /*
    Create a relationship with a version. Note that this will override the previous version if a link already exist.
  */
  createRelatedVersion: function(resource, version, next) {
    var now   = helpers.now(),
        props = { 
          resource_id: resource.id,
          yaml: version.yaml,
          service: version.service,
          language: version.language,
          creation_date: now.date,
          creation_time: now.time
        },
        query = parser.agentBrown(vQueries.merge_relationship_resource_version, props);
        
    neo4j.query(query, props, function (err, nodes) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      next(null, nodes[0]);
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
    /*
      WATERFALL of discovery.
      Ath the end of this waterfall we should have a list
      of well written entities.
    */
    async.waterfall([
      /*
      
        1. load the resource from neo4j db ... :D
      */
      function loadResourceFromNeo4j (callback) {
        neo4j.read(resource.id, function (err, node) {
          if(err)
            callback(err);
          else
            callback(null, node);
        });
      },
      /*
      
        2. verify that the languages have been assigned to the resource.
      
      */
      function checkLanguages(resource, callback) {
        if(resource.languages) {
          callback(null, resource);
          return;
        }
        // get the content from the required properties for the analysis.
        var content = _.compact(settings.disambiguation.fields.map(function (field) {
          return result.item[field];
        }));
        
        if(!content.length)
          return callback('no language has been specified for the resource');
        
        // automatic language detection
        var Langdetect = require('languagedetect'),
            langdetect = new Langdetect('iso2'),
            languages  = langdetect.detect(content.join('. ')),
            language   = languages.length? _.first(_.first(languages)) : 'en';
        
        result.item.languages = [language];
        // create corresponding field to enable extraction
        settings.disambiguation.fields.forEach(function (field) {
          resource[ field + '_' + language]  = resource[field];
        });
        
        // save resource, then go to next task.
        neo4j.save(resource, function (err, node) {
          if(err)
            callback(err);
          else
            callback(null, node);
        })
      },
      /*
      
        3. EXTRACT!
        extract from yago and / or other services, according to resource language.
        Note that according to various service terms of use, we cannot proceed async
        (due to the limitation of parallel request for free service, for instance)
      */
      function extract(resource, callback) {
        var candidates = []; // candidate entities extracted by various mechanisms
              
        var q = async.queue(function (language, nextLanguage) {
          var filename = 'contents/resource_' + resource.doi + '_discover__'+ language + '.json',
              content; // the text content to be disambiguated. if it's too long, helpers method should chunk it.
              
          // check if the content for this language has already been discovered
          if(fs.existsSync(filename)) {
            console.log('  using cached file', filename, q.length())
            var cached_candidates = require('../'+filename);
            candidates = candidates.concat(cached_candidates);
            console.log(candidates.length, 'found')
            nextLanguage();
            return;
          }
          // concatenate fields as defined in settings.js
          content = settings.disambiguation.fields.map(function (d) {
            return resource[d + '_' + language] || ''   
          }).join('. ');
          
          // launch the extraction chain, cfr settings.disambiguation.services
          async.parallel(_.map(settings.disambiguation.services, function (supportedLanguages, service) {
            return function (_callback) {
              if(supportedLanguages.indexOf(language) == -1) {
                _callback(null, []);
                return;
              };
              console.log(service,'calling for', language);
              helpers[service]({
                text: content
              }, function (err, _entities) {
                console.log(service,'success for language', language);
                if(err)
                  _callback(err);
                else
                  _callback(null, _entities.map(function (d) {
                    d.context.language = language;
                    d.service = service;
                    return d;
                  }));
              });
            }
          }), function (err, results) { // interrupt queue
            if(err) {
              q.kill();
              return callback(err);
            }
            candidates = candidates.concat(_.flatten(results));
            fs.writeFileSync(filename, JSON.stringify(candidates, null, 2));
            nextLanguage();
          });

        }, 1);
        
        q.push(resource.languages);
        
        q.drain = function() {
          callback(null, resource, candidates.filter(function (d) {
            return d.type.length > 0
          }));
        }
      },
      /*
      
        4. Disambiguate locations
        and add LAT and LNG to 'location' entities candidate
      */
      function geodisambiguate(resource, candidates, callback) {
        var locations = candidates.filter(function (d) {
              return d.type.indexOf('location') != -1
            }),
            
            remaining = candidates.filter(function (d) {
              return d.type.indexOf('location') == -1
            }),
            
            geodisambiguated = [];
            _cached       = [];
        
        var q = async.queue(function (candidate, nextCandidate) {
          if(_cached[candidate.name + candidate.context.language]) {
            console.log('found', candidate.name + candidate.context.language)
            geodisambiguated.push(_cached[candidate.name + candidate.context.language]);
            nextCandidate();
            return;
          }console.log('sodqposidpqoidpqodiqp', q.length(), locations.length)
          // disambiguate with geonames (only, sic!)
          helpers.geonames({
            text: candidate.name,
            language: candidate.context.language
          }, function (err, results) {
            if(!results.length) {
              nextCandidate();
              return;
            } else if(err)
              throw err;
            var location = results[0];
            
            _cached[candidate.name + candidate.context.language] = _.assign(candidate, {
              geoname_fcl: location.fcl,
              geoname_lat: location.lat,
              geoname_lng: location.lng,
              geoname_id: location.geonameId,
              name: location.name, // yep, change name
              q: location.query
            });
            console.log(_cached[candidate.name + candidate.context.language])
            geodisambiguated.push(_cached[candidate.name + candidate.context.language]);
            nextCandidate();
          })
        }, 1);
        
        q.push(locations);
        q.drain = function() {
          console.log(geodisambiguated)
          callback(null, resource, geodisambiguated.concat(remaining))
        };
      },
      /*
      
        5. cluster entities
        based on their name or wikipedia identifier, if provided.
        and evaluate thrustworthiness
      */
      function clusterEntities(resource, locations, candidates, callback) {
        helpers.align(candidates, function (err, entities) {
          if(err)
            callback(err)
          else
            callback(null, resource, entities.concat(locations));
        })
      },
      /*
      
        6. SAVE
       
       */
      function saveEntities(resource, entities, callback) {
        var yaml = {}; // the yaml version of entity id and splitpoints.
        
        var q = async.queue(function (ent, nextEntity) {
          // for ech entity
          if(ent.type[0] == 'location') {
            console.log('skipping', ent.name, 'query:', ent.q)
            nextEntity()
            return
          }
          console.log(ent.name,'(',ent.type[0],'), remaining', q.length())
          
          module.exports.createRelatedEntity(resource, {
            name: ent.name,
            type: _.first(ent.type),
            trustworthiness: ent.trustworthiness,
            links_wiki: ent.links_wiki
          }, function (err, entity) {
            if(err) {
              q.kill();
              return callback(err);
            }
            // complete the yaml of this specific language
            _.forEach(ent.context, function (d) {
              yaml[d.language] = (yaml[d.language] || []).concat({
                id: entity.id,
                context: {
                  left: d.left,
                  right: d.right
                }
              });
            });
            nextEntity();
          })
        }, 1);
        // just save typized links ...
        q.push(entities);
        q.drain = function() {
          callback(null, resource, yaml);
        };
      },
      /*
      
        7. SAVE annotation, per language
           save the yaml in a (ver:version) for the current language
      */
      function saveAnnotation(resource, yaml, callback) {
        var q = async.queue(function (version, nextVersion) {
          module.exports.createRelatedVersion(resource, version, function (err, ver) {
            if(err)
              throw err;
            nextVersion()
          })
        }, 1);
        // remap yaml to match version data model
        q.push(_.map(yaml, function (d, language) {
          return {
            language: language,
            service: 'ner',
            yaml: YAML.stringify(d, 2)
          }
        }));
        
        q.drain = function() {
          callback(null, resource);
        }
      }
    ], function (err, resource) {
      if(err)
        next(err)
      else
        next(null, resource)
    })
    //helpers.
  }
}