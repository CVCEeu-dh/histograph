/**
 * Resource Model for documents, video etc...
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers'),
    parser    = require('../parser'),
    neo4j     = require('seraph')(settings.neo4j.host),
    
    rQueries  = require('decypher')('./queries/resource.cyp'),
    vQueries  = require('decypher')('./queries/version.cyp'),
    
    models    = require('../helpers/models'),
    
    fs        = require('fs'),
    path      = require('path'),
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
  FIELDS: [
    'id',
    'slug',
    'name',
    'title_en',
    'caption_en',
    'url',
    'url_en', // the txt file in english
    'start_date',
    'end_date',
    'viaf_id'
  ],
  
  UPDATABLE: [
    'slug',
    'name',
    'title_en',
    'caption_en',
    'url_en',
    'start_date',
    'end_date',
    'viaf_id'
  ],

  /**
    get a complete resource object (with versions, comments etc...).
    @param resource.id - numeric identifier only
    @param user - the current user
   */
  get: function(resource, user, next) {
    if(typeof resource != 'object') {
      resource = {
        id: resource
      }
    }
    var query = parser.agentBrown(rQueries.get_resource)
    neo4j.query(rQueries.get_resource, {
      id: resource.id,
      username: user.username
    }, function (err, items) {
      
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
      var versions = _.map(_.filter(_.values(item.versions),function (d) {
        //filter
        return d.yaml && d.yaml.length > 0
      }), function (d) {
        //map
        if(d.yaml)
          d.yaml = YAML.parse(d.yaml);
        return d;
      });
      
      item.positionings = _.filter(versions, {type:'positioning'});
      item.annotations = _.filter(versions, {type:'annotation'});
      item.collections = _.values(item.collections);
      // console.log(item.annotations)
      next(null, module.exports.normalize(item));
    });  
  },
  
  /*
    Available params are limit, offset, order by.
  */
  getMany: function(params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_resources,
        items: rQueries.get_resources
      },
      params: params
    }, function (err, results) {
      if(err)
        next(err)
      else
        next(null, module.exports.normalize(results.items, params), results.count_items);
    });
  },
  /*
    Get annotated text
    for a given (resource:resource) node and (annotation:annotation)
  */
  getAnnotatedText: function(resource, annotation, params) {
        var annotations,
            availableAnnotationFields = [],
            content;
        // parse Yaml if it it hasn't been done yet
        if(typeof annotation.yaml == 'string')
          annotation.yaml = YAML.parse(annotation.yaml);
        annotation.yaml == null && console.log(annotation)
        
        if(!annotation.yaml) {
          return {
            language: annotation.language,
            annotation: ''
          }
        }
        
        // recover content from disambiguation field section, as a list (antd not as a string)
        content = settings.disambiguation.fields.map(function (field){
          var c = module.exports.getText(resource, {
            fields: [field],
            language: annotation.language
          });
          if(c.length) // recreate a fields list of known annotations
            availableAnnotationFields.push(field);
          return c;
        });
        
        if(params && params.with && _.last(settings.disambiguation.fields) == 'url')   {
          // for the NON URL fields, just do the same as before
          // console.log('content', resource.title_en, annotation.language)
          var fulltext = content.pop(),
              offset   = content.length? _.compact(content).reduce(function(p,c) {
                return p.length + c.length + '§ '.length;
              }): 0;
          // console.log(annotation.yaml)
          // Annotate the fields as usual, just filtering the points. Note the _.compact that eliminates empty content :()
          annotations = parser.annotate(_.compact(content).join('§ '), annotation.yaml.filter(function (d) {
            return params.with.indexOf(+d.id) != -1
          })).split('§ ');
          
          // annotate partials MATCHES only
          annotations.push(parser.annotateMatches(fulltext, {
            points: annotation.yaml,
            ids: params.with,
            offset: offset - 2
          }));
          content.push(fulltext); // pop before, push right now. TO BE REFACTORED.
        } else {
          
          annotations = parser.annotate(_.compact(content).join('§ '), annotation.yaml, {}).split('§ ');
        }
        
        annotation.annotated = {};
        
        availableAnnotationFields.forEach(function (field, i){
          annotation.annotated[field] = annotations[i];
        });
        // console.log('\n\n',resource.slug, annotation.language, annotations)
        return {
          language: annotation.language,
          annotation: annotation.annotated
        }
    
  },
  normalize: function(node, params) {
    if(_.isArray(node))
      return node.map(function (n) {
        return module.exports.normalize(n, params);
      });
    // resolve annotations, if they've been provided
    if(node.annotations) {
      node.annotations = _.map(_.filter(node.annotations, 'language'), function (ann) {
        return module.exports.getAnnotatedText(node.props, ann, params);
      });
    }
    
    // node.themes = _.values(node.themes || []).filter(function (n) {
    //   return n.id
    // });
    // node.places = _.values(node.places || []).filter(function (n) {
    //   return n.id
    // });
    // node.persons = _.values(node.persons).filter(function (n) {
    //   return n.id
    // });
    // node.locations = _.values(node.locations).filter(function (n) {
    //   return n.id
    // });
    // node.organizations = _.values(node.organizations).filter(function (n) {
    //   return n.id
    // });
    // node.social_groups = _.values(node.social_groups).filter(function (n) {
    //   return n.id
    // });
    return node;
  },
  /*
    Provide here a list of valid ids
  */
  getByIds: function(params, next) {
    // remove orderby from params
    if(params.orderby)
      delete params.orderby
    
    var query = parser.agentBrown(rQueries.get_resources, params);
    // console.log(query)

    // console.log('getById', query, params)
    neo4j.query(query, _.assign(params, {
      limit: params.limit || params.ids.length,
      offset: 0
    }), function (err, items) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      
      // console.log(params, items.length)
      var itemsAsDict = _.indexBy(module.exports.normalize(items, params),'id');
      // console.log(itemsAsDict)
      next(null, params.ids.map(function (id) {
        return itemsAsDict[''+id]
      }), {
        total_items : items.length
      });
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
        query;
    // create start_time if its not present
    if(!properties.start_time && properties.start_date) {
      properties = _.assign(properties, helpers.reconcileIntervals({
        start_date: properties.start_date,
        end_date: properties.end_date,
        format: properties.dateformat || 'YYYY-MM-DD',
        strict: properties.datestrict
      }));
      
    }
    properties = _.assign(properties, {
      uuid: helpers.uuid(),
      creation_date: now.date,
      creation_time: now.time,
      username: properties.user.username
    });
    
    query = parser.agentBrown(rQueries.merge_resource, properties);
    
    neo4j.query(query, properties, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      if(!node.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      next(null, node[0]);
    });
  },
  
  /*
    Create a nice index according to your legay index.
    Not needed if using node_auto_index!
  */
  index: function(resource, next) {
    async.parallel(_.map(['full_search', 'title_search'], function(legacyindex) {
      return function(n) {
        console.log('indexing', legacyindex, resource.props[legacyindex])
        neo4j.legacyindex.add(legacyindex, resource.id, (legacyindex, resource[legacyindex] || resource.props[legacyindex] || '').toLowerCase(), n);
      }
    }), next);
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
  
  /*
    Create a special relationship (u)-[:♥]->(res) between the resource and the user
    
  */
  createRelatedUser: function(resource, user, next) {
    var now   = helpers.now();
        
    neo4j.query(rQueries.create_related_user, { 
      id: resource.id,
      username: user.username,
      creation_date: now.date,
      creation_time: now.time
    }, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes[0]);
    });
  },
  /*
    Remove a rlikes relationship, only if the current authentified user
    is the owner of the relationship.
  */
  removeRelatedUser: function(resource, user, next) {
    neo4j.query(rQueries.remove_related_user, { 
      id: resource.id,
      username: user.username
    }, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes[0]);
    });
  },
  /*
    Get the list of users related to the resource
  */
  getRelatedUsers: function(resource, params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_related_users,
        items: rQueries.get_related_users
      },
      params: {
        id:     +resource.id,
        limit:  +params.limit || 10,
        offset: +params.offset || 0
      }
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }

      next(null, _.filter(results.items, 'id'), {
        total_items: results.count_items
      });
    }); 
  },
  /*
    Return the list of actions mentioning the requested resource.
    The params.action param should be a valid action 'kind', cfr server.js
  */
  getRelatedActions: function(resource, params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_related_actions,
        items: rQueries.get_related_actions
      },
      params: {
        id:     +resource.id,
        kind:   params.action,
        limit:  params.limit,
        offset: params.offset
      }
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }

      next(null, _.map(results.items, function (d) {
        d.props.annotation = parser.yaml(d.props.annotation);
        return d
      }), {
        total_items: results.count_items
      });
    }); 
  },
  
  update: function(id, properties, next) {

  },
  /*
    Change the resoruce label to :trash in order to manually
    @return (err, resource:Resource)
  */
  remove: function(resource, next) {
    neo4j.query(rQueries.remove_resource, {
      id: resource.id
    }, function(err) {
      if(err)
        next(err);
      else
        next();
    });
  },
  /**
    Monopartite graph
    DEPRECATED. cfr getRelatedEntitiesGraph
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
    Monopartite graph
    params must contain an integer ID
  */
  getRelatedEntitiesGraph: function(params, next) {
    var query = parser.agentBrown(rQueries.get_related_entities_graph, params)
    helpers.cypherGraph(query, params, function (err, graph) {
      if(err) {
        next(err);
        return
      };
      next(null, graph);
    });
  },
  
  /**
    Monopartite graph of related resources
    DEPRECATED getRelatedEntitiesGraph
  */
  getRelatedResourcesGraph: function(resource, params, next) {
    helpers.cypherGraph(rQueries.get_related_resources_graph, _.assign({
      id: resource.id
    }, params), function (err, graph) {
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
  /*
    Return the timeline of document related resource.
  */
  getRelatedResourcesTimeline: function(resource, properties, next) {
    helpers.cypherTimeline(rQueries.get_related_resources_timeline, _.assign({}, properties, resource), function (err, timeline) {
      if(err)
        next(err);
      else
        next(null, timeline);
    });
  },
  
  
  getRelatedResources: function (params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_related_resources,
        items: rQueries.get_related_resources
      },
      params: params
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      next(null, results.items, results.count_items);
      
      // module.exports.getByIds(_.assign({}, params, {
      //   ids: _.map(results.items, 'target')
      // }), function (err, items){
      //   next(null, items, results.count_items);
      // });
      
    }); 
    
  },
  /*
    Return the related entities according to type.
    @param params - a dict containing at least the entity label (type: 'person|location') and the resource id
  */
  getRelatedEntities: function (params, next) {
    models.getMany({
      queries: {
        count_items: rQueries.count_related_entities,
        items: rQueries.get_related_entities
      },
      params: {
        entity: params.entity,
        id: +params.id,
        limit: +params.limit || 10,
        offset: +params.offset || 0
      }
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      next(null, results.items, results.count_items);
    }); 
    
  },

  /*
    Return the related entities facets acoording to a specific entity type (neo4j label)
  */
  getElastic: function(params, next){
    _.assign(params, {
      entity: params.entity || 'entity',
      limit: +params.limit || 100,
      offset: +params.offset || 0
    });

    var query = parser.agentBrown(rQueries.facet_related_entities, params);

    neo4j.query(query, params, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes);
    });
  },
  /*
    Return the related entities facets related to entities connected with a specific resource.
    Please specific the entity type (neo4j label)
  */
  getRelatedResourcesElastic: function(resource, params, next) {
    _.assign(params, {
      id: resource.id,
      entity: params.entity || 'entity',
      limit: +params.limit || 100,
      offset: +params.offset || 0
    });

    var query = parser.agentBrown(rQueries.facet_related_resources_entities, params);

    neo4j.query(query, params, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes);
    });
  },

  /*
    Return the 
  */
  getText: function(resource, options) {
    return _.compact(options.fields.map(function (d) {
      if(d == 'url') {
        if(!_.isEmpty(resource[d + '_' + options.language])) {
          try{
            var stats = fs.statSync(settings.paths.txt + '/' + resource[d + '_' + options.language]);
            if(stats.size > (settings.disambiguation.maxSize || 100000))
              return '';
            return fs.readFileSync(settings.paths.txt + '/' + resource[d + '_' + options.language], {
              encoding: 'utf8'
            }) || '';
          } catch(e) {

            // console.log('!warning, resource.getText(), file not found or not valid...', e)
            return '';
          }
        }
        return '';
      }
      if(settings.disambiguation.regexp && settings.disambiguation.regexp[d]) {
        // apply recursively
        
        var content = (resource[d + '_' + options.language] || '')
        _.each(settings.disambiguation.regexp[d], function (rule) {
          content = content.replace(rule.pattern, rule.replace);
        })
        console.log('content', content)

        return content
      }
      // console.log(options, d, d + '_' + options.language)
      return resource[d + '_' + options.language] || '';
    })).join('. ');
  }, 


  /*
    Call geo query, return a list of location
    (accept resource filters)
  */  
  getGeo: function(params, next){
    var query = parser.agentBrown(rQueries.get_geo, params);
    neo4j.query(query, params, next);
    
  },
  
  /*
    The long chain of the discovery.
    Perform TEXTRAZOR on some field of our darling resource and 
    GEOCODE/GEONAMES for the found PLACES entities
  */
  discover: function(resource, next) {
    var clc = require('cli-color'),
        entities = [],
        
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
        console.log(clc.whiteBright('   loading'), 'resource:', resource.id);
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
      function checkLanguages(resource, callback) { console.log(clc.whiteBright('   checking languages'), 'resource:', resource.id,'uuid:', resource.uuid);
        if(resource.languages) {
          callback(null, resource);
          return;
        }
        // get the content from the required properties for the analysis.
        var content = _.compact(settings.disambiguation.fields.map(function (field) {
          return resource[field];
        }));
        
        if(!content.length) {
          // signale issue
          return callback(helpers.IS_EMPTY);
        };
        
        // automatic language detection
        var Langdetect = require('languagedetect'),
            langdetect = new Langdetect('iso2'),
            languages  = langdetect.detect(content.join('. ')),
            language   = languages.length? _.first(_.first(languages)) : 'en';
        
        resource.languages = [language];
        // create corresponding field to enable extraction
        settings.disambiguation.fields.forEach(function (field) {
          if(resource[field])
            resource[ field + '_' + language]  = resource[field];
        });
        
        
        // save resource, then go to next task.
        neo4j.save(resource, function (err, node) {
          if(err)
            return callback(err);
          console.log('resource saved')
          callback(null, node);
        })
      },
      /*
        2.B check slug and name according to avaialbe fields
      */
      function checkSlug(resource, callback) { console.log(clc.yellowBright('   checking slug'));
        if(!_.isEmpty(resource.slug) && !_.isEmpty(resource.name)) {
          callback(null, resource);
          return;
        }
        // give it a name (english version)
        if(_.isEmpty(resource.name))
          resource.name = _.first(_.compact([resource.title_en].concat(resource.languages.map(function (language) {
            return resource['title_' + language];
          }))));
        
        if(_.isEmpty(resource.name)) {
          console.log(resource);
          return callback('resource', resource.id, 'must have at least one valid title field');
        }
          
        if(_.isEmpty(resource.slug)) {
          resource.slug = helpers.text.slugify(resource.name);
        }
        
        neo4j.save(resource, function (err, node) {
          if(err)
            return callback(err);
          console.log('resource saved')
          callback(null, node);
        })
        
      },
      
      /*
        2. C check date
      */
      function checkDate(resource, callback) {
        if(!isNaN(resource.start_time)) {
          callback(null, resource);
          return
        }
        var dates = [],
            toUpdate = {},
            candidates,
            best_candidate;
        // get the date field, from the title, each language
        resource.languages.forEach(function (language) {
          console.log(clc.blackBright('   checking date in title for language'), language);
          if(!_.isEmpty(resource['title_' + language]))
            dates.push(_.assign({
              language: language
            }, helpers.reconcileHumanDate(resource['title_' + language], language)));
        });
        // get the top result; candidates can be n empty array (no undefined stuff.)
        candidates = _.sortBy(_.values(_.groupBy(_.filter(dates, 'start_time'), 'start_time')), function (d){
          return -d.length;
        });
        
        if(candidates.length) {
          best_candidate = _.first(candidates);
          // get date languages, sorted by language e.g '[de,en,fr]'
          toUpdate['date_languages'] = _.map(best_candidate, 'language').sort();
          _.assign(toUpdate, {
            start_time: best_candidate[0].start_time,
            end_time: best_candidate[0].end_time,
            start_date: best_candidate[0].start_date,
            end_date: best_candidate[0].end_date
          })
          console.log(toUpdate)
          // if(languages)
        }
        // do not save empty object
        if(!_.size(toUpdate)) {
          callback(null, resource);
          return
        }
        neo4j.save(_.assign(resource, toUpdate), function (err, node) {
          if(err)
            return callback(err);
          console.log('resource saved')
          callback(null, node);
        })
      },
      /*
      
        3. EXTRACT!
        extract from yago and / or other services, according to resource language.
        Note that according to various service terms of use, we cannot proceed async
        (due to the limitation of parallel request for free service, for instance)
      */
      function extract(resource, callback) {console.log(clc.whiteBright('   extract'));
        var candidates = []; // candidate entities extracted by various mechanisms
        
        var q = async.queue(function (language, nextLanguage) {
          var filename = [
                'resource',
                resource.id,
                _.keys(settings.disambiguation.services).join('_'),
                language
              ].join('_') + '.json',
              
              content; // the text content to be disambiguated. if it's too long, helpers method should chunk it.
          
          if(settings.paths.cache && settings.paths.cache.disambiguation) {
            try{
              var contents = fs.readFileSync(path.join(settings.paths.cache.disambiguation, filename), {
                    encoding: 'utf8'
                  }),
                  cached_candidates = JSON.parse(contents);
                  
              candidates = candidates.concat(cached_candidates);
              console.log(clc.blackBright('   found', clc.whiteBright(candidates.length), 'candidates (cache)'))
              nextLanguage();
              return;
            } catch (e) {
              console.log(e)
            }
          }
          // check if the content for this language has already been discovered
          // if(fs.existsSync(filename)) {
          //   // console.log(clc.blackBright('  using cached file', clc.whiteBright(filename), q.length()));
          //   var cached_candidates = require('../'+filename);
          //   candidates = candidates.concat(cached_candidates);
          //   console.log(clc.blackBright('  found', clc.whiteBright(candidates.length), 'candidates (cache)'))
          //   nextLanguage();
          //   return;
          // }
          // concatenate fields as defined in settings.js
          content = module.exports.getText(resource, {
            language: language,
            fields: settings.disambiguation.fields
          });
          console.log(settings.disambiguation.fields, language)
          // launch the extraction chain, cfr settings.disambiguation.services
          async.parallel(_.map(settings.disambiguation.services, function (supportedLanguages, service) {
            return function (_callback) {
              if(supportedLanguages.indexOf(language) == -1) {
                _callback(null, []);
                return;
              };
              if(settings.disambiguation.typeRelatedServices && settings.disambiguation.typeRelatedServices.indexOf(service) != -1 && settings.disambiguation.typeRelatedServices.indexOf(resource.type) != -1 && resource.type != service) {
                // ignore service because it is related to a specific type
                console.log('   ',service,'ignored for type:', resource.type, '- language:',language);
                _callback(null, []);
                return;
              };
              var contentToAnalyze = ''+content;
              if(settings.disambiguation.regexp && settings.disambiguation.regexp[service])
                _.each(settings.disambiguation.regexp[service], function (rule) {
                  contentToAnalyze = contentToAnalyze.replace(rule.pattern, rule.replace);
                  console.log(contentToAnalyze)
                })
              console.log('   ',service,'calling... - language:', language);
              helpers[service]({
                text: contentToAnalyze
              }, function (err, _entities) {
                console.log('   ',service,'success - language:', language);
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
            
            // write to cache
            if(settings.paths.cache && settings.paths.cache.disambiguation) {
              fs.writeFileSync(path.join(settings.paths.cache.disambiguation, filename), JSON.stringify(candidates, null, 2));
            }
            nextLanguage();
          });

        }, 1);
        
        q.push(resource.languages);
        
        q.drain = function() {
          var valid_candidates = candidates.filter(function (d) {
            return d.type.length > 0
          });
          console.log(clc.blackBright('   cleaning entities: keeping',clc.whiteBright(valid_candidates.length), 'out of', clc.whiteBright(candidates.length)))
          callback(null, resource,valid_candidates );
        }
      },
      
      /*
      
        4. cluster entities
        based on their name or wikipedia identifier, if provided.
        and evaluate trustworthiness
      */
      function clusterEntities(resource, candidates, callback) { console.log(clc.whiteBright('   cluster entities'))
      console.log(clc.blackBright('   considering',clc.magentaBright(candidates.length),'candidates for clustering...'));
        helpers.cluster(candidates, function (err, entities) {
          if(err)
            callback(err)
          else
            callback(null, resource, entities);
        })
      },
      
      /*
      
        5. enrich entities with lat, lng.
        and add LAT and LNG to 'location' entities candidate.
        
      */
      function geoextract(resource, candidates, callback) { console.log(clc.whiteBright('   geoestract'))
        
            
        var withGeo = candidates.filter(function (d) {
              return d.type.indexOf('location') != -1
            }),
            
            withoutGeo = candidates.filter(function (d) {
              return d.type.indexOf('location') == -1
            }),
            
            _cached  = {},
            _locations = [];
            
        console.log(clc.blackBright('   considering', clc.whiteBright(candidates.length), 'candidates; among them,', clc.magentaBright(withGeo.length), 'of type', clc.whiteBright('location')))

        //console.log('geodis', settings.disambiguation.geoservices)
        var q = async.queue(function (candidate, nextCandidate) {
          // for each candidate entity, try to democratic disambiguate...
          async.parallel(_.map(settings.disambiguation.geoservices, function (supportedLanguages, service) {
            return function (_callback) {
              // key for ram cached object
              var _key = ([service, candidate.name].join('_')).toLowerCase();
           
              // check if we already call this service
              if(_cached[_key]) {
                _callback(null, _cached[_key]);
                return;
              }
              console.log(clc.blackBright('  ',service,'for query', candidate.name));
              
              // call the DESIRED service, in parallel.
              helpers[service]({
                text: candidate.name,
                language: 'en' //, language: candidate.context.language // since geonames and geocoding do not care about language
              }, function (err, _entities) {
                console.log(clc.blackBright('  ',service,clc.cyanBright('success'),'for query', candidate.name));
                if(err)
                  return _callback(err);
                console.log('  ...', _entities.length,'results', _.map(_entities, 'fcl'));
                
                // write lo local cache the results objects
                _cached[_key] = _entities.filter(function (d) {
                  return d.fcl && d.fcl != 'L' // too generic locations (e.g Africa or Europe), discard...
                }).map(function (d) {
                  d.service = service
                  return d;
                });
                
                _callback(null, _cached[_key]);
              });
            }
          }), function (err, results) { // interrupt queue
            if(err) {
              q.kill();
              return callback(err); // stop top level waterfall
            }
            
            // merge the results coming from the different services.
            var locations = _.flatten(results);
            
            if(!locations.length) {
              candidate.type = [ 'topic' ];
              withoutGeo.push(candidate);
              nextCandidate();
              return;
            }
            
            // align them geographically
            helpers.geocluster(locations, function (err, location) {
              if(err) {
                nextCandidate();
                return;
              }
              var trustworthiness = .5*(candidate.trustworthiness||0) + .5*(location.trustworthiness||0);
              // if(trustworthiness >= settings.disambiguation.threshold.trustworthiness)
                _locations.push(_.assign(candidate, location, {
                  geotrustworthiness: location.trustworthiness,
                  trustworthiness: trustworthiness,
                  name: candidate.name
                }));
              
              setTimeout(nextCandidate, 5);
              // 
            })
            
          });

        }, 1);

        q.push(withGeo);
        q.drain = function() {
          console.log(clc.blackBright('   found',clc.magentaBright(_locations.length),'locations while looping over', clc.whiteBright(withGeo.length),'locations'));
          // console.log(_locations)
          
          callback(null, resource, _locations.concat(withoutGeo));
        };
      },
      
      /*
      
        6. SAVE
       
       */
      function saveEntities(resource, entities, callback) { console.log(clc.whiteBright('   saving entities'))
        var yaml = {}; // the yaml version of entity id and splitpoints.
        
        var q = async.queue(function (ent, nextEntity) {
          // for ech entity
          // if(ent.type[0] == 'location') {
          //   console.log('skipping', ent.name, 'query:', ent.geoname_q, ent.geoname_fcl)
          //   nextEntity()
          //   return
          // }
          console.log(clc.blackBright('   saving', clc.yellowBright(ent.name),'as', clc.whiteBright(ent.type[0]), ent.trustworthiness,'remaining', q.length()));
          var additionalProperties = {};
          if(_.first(ent.type) == 'location') {
            additionalProperties = {
              lat: ent.lat,
              lng: ent.lng,
              fcl: ent.fcl,
              country: ent.country,
              geoname_id: ent.geoname_id,
              geoname_fcl: ent.geoname_fcl,
              geoname_country: ent.geoname_country,
              geocoding_id: ent.geocoding_id,
              geocoding_fcl: ent.geocoding_fcl,
              geocoding_country: ent.geocoding_country
            }
          }
          // console.log(ent.context)
          
          module.exports.createRelatedEntity(resource, _.assign(additionalProperties, {
            name: ent.name,
            type: _.first(ent.type),
            services: ent.services,
            languages: ent.languages,
            frequency: ent.context.length,
            links_wiki: ent.links_wiki
          }), function (err, entity) {
            if(err) {
              q.kill();
              return callback(err);
            }
            console.log(entity)
            
            for(var i in ent.context) {
              if(!yaml[ent.context[i].language])
                yaml[ent.context[i].language] = [];
              yaml[ent.context[i].language].push({
                id: entity.props.uuid,
                context: {
                  left: ent.context[i].left,
                  right: ent.context[i].right
                }
              });
            }
            // complete the yaml of this specific language
            // _.forEach(ent.context, function (d) {
            //   yaml[d.language] = (yaml[d.language] || []).concat([{
            //     id: entity.id,
            //     context: {
            //       left: d.left,
            //       right: d.right
            //     }
            //   }]);
            // });
            console.log('    language:', ent.languages[0], '- n. splitpoints:',yaml[ent.languages[0]].length)
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