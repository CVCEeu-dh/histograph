

/**
 * Entity Model for Location, Organisation, etc...
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers'),
    services  = require('../services'),
    models    = require('../helpers/models'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/entity.cyp'),
    parser    = require('../parser.js'),
    
    crowdsourcing = require('../crowdsourcing/entity.js'),
    clc       = require('cli-color'),
    async     = require('async'),
    _         = require('lodash'),
    
    Action  = require('../models/action'),
    Issue   = require('../models/issue'),
    Resource  = require('../models/resource');
    
    

module.exports = {
  FIELDS: [
    'id',
    'slug',
    'name',
  ],
  
  UPDATABLE: [
    'slug',
    'name',
  ],
  /*
    Create a new entity or merge it if an entity with the same wikilink exists.
    Note that an entity must be linked to a document.
  */
  create: function(properties, next) {
    var now   = helpers.now(),
        props = _.assign(properties, {
          type: properties.type || 'unknown',
          slug: properties.slug || helpers.text.slugify(properties.name),
          links_wiki: _.isEmpty(properties.links_wiki)? undefined: properties.links_wiki,
          exec_date: now.date,
          exec_time: now.time,
          services: properties.services,
          languages: properties.languages,
          frequency: properties.frequency || 1,
          resource_id: properties.resource.id,
          name_search: properties.name_search || properties.name.toLowerCase()
        }),
        query = parser.agentBrown(queries.merge_entity, props);
        
    neo4j.query(query, props, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes[0]);
    })
  },
  
  /*
    Create a relationship with the user who is in charge of it.
  */
  createRelatedUser: function(entity, user, next) {
    var now   = helpers.now(),
        props = { 
          id: entity.id,
          username: user.username,
          creation_date: now.date,
          creation_time: now.time
        },
        query = parser.agentBrown(queries.merge_user_entity_relationship, props);
        
    neo4j.query(query, props, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes[0]);
    });
  },
  
  get: function(id, next) {
    neo4j.query(queries.get_entity, {
      id: +id
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      if(!node.length) {
        next(helpers.IS_EMPTY);
        return;
      }
        
      // select current abstract based on the language chosen, fallback to english
      next(null, node[0]);
    })
  },
  /*
    Provide here a list of valid ids
  */
  getByIds: function(ids, next) {
    neo4j.query(queries.get_entities_by_ids, {
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
        item.languages = _.values(item.languages); 
        return item;
      }));
    });
  },
  /*
    get related resoruces
  */
  getRelatedResources: function(params, next) {
    models.getMany({
      queries: {
        count_items: queries.count_related_resources,
        items: queries.get_related_resources
      },
      params: params
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      next(null, Resource.normalize(results.items, params), results.count_items);
    });
  },
  
  /*
    Return the related entities according to type.
    @param params - a dict containing at least the entity label (type: 'person|location') and the resource id
  */
  getRelatedEntities: function (params, next) {
    models.getMany({
      queries: {
        count_items: queries.count_related_entities,
        items: queries.get_related_entities
      },
      params: params
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
    Change the relationship status from resource to the entity.
    DOWNVOTE the relationship
  */
  signaleRelatedResource: function(entity, resource, next) {
    
  },

  /*
    Create (or merge) a manual [appears_in] relationship between the entity and the resource.
    api. The entity will be upvoted; the entity-resoruce relationship will be created, or merged, then upvoted.
    @param entity   - entity.id should be an integer identifier
    @param resource - resource.id should be an integer identifier
    @param user     - user.id and user.username should exist
    @param params   - used only wioth params.action upvote or downvote
  */
  createRelatedResource: function(entity, resource, user, params, next) {
    var now = helpers.now();

    neo4j.query(queries.merge_entity_related_resource, {
      entity_id: entity.id,
      resource_id: resource.id,
      user_id: user.id,
      username: user.username,
      frequence: params.frequence || 1,
      exec_date: now.date,
      exec_time: now.time
    }, function (err, results) {
      if(err || !results.length) {
        next(err || helpers.IS_EMPTY);
        return;
      }

      var result = results[0];
      
      // 1. UPVOTE ENTITY upvote automatically, since you admitted that the entity exists ;)
      // it increases score and celebrity, removes from the downvotes if any
      result.ent.upvote = _.unique((result.ent.upvote || []).concat(user.username));
      if(result.ent.downvote && !!~result.ent.downvote.indexOf(user.username)) {
        result.ent.downvote = _.remove(result.ent.downvote, user.username);
      }
      result.ent.celebrity =  result.ent.upvote.length + (result.ent.downvote|| []).length;
      result.ent.score = result.ent.upvote.length - (result.ent.downvote|| []).length;
      

      // 2. UPVOTE RELATIONSHIP
      result.rel.properties.upvote = _.unique((result.rel.properties.upvote || []).concat(user.username));
      if(result.rel.properties.downvote && !!~result.rel.properties.downvote.indexOf(user.username)) {
        result.rel.properties.downvote = _.remove(result.rel.properties.downvote, user.username);
      }
      // create issue to track events in global stuff


      // download the updated version for the given resource
      async.series({
        entity: function (callback) {
          neo4j.save(result.ent, callback);
        },
        relationship: function (callback) {
          neo4j.rel.update(result.rel, callback);
        },
        action: function(callback) {
          Action.create({
            kind: Action.CREATE,
            target: Action.APPEARS_IN_RELATIONSHIP,
            mentions: [resource.id, entity.id],
            username: user.username
          }, callback);
        },
        resource: function (callback) {
          Resource.get({
            id: result.res.id
          }, callback)
        }
      }, function (err, results) {
        if(err)
          next(err);
        else
          next(null, {
            id: result.ent.id,
            type: result.ent.type,
            props: result.ent,
            related: {
              resource: results.resource,
              action: results.action
            },
            rel: result.rel.properties
          });
      });
    });
  },
  /*
    Upvote the related resource.
    api
    @param entity   - entity.id should be an integer identifier
    @param resoruce - resource.id should be an integer identifier
    @param user     - user.id and user.username should exist
    @param params   - used only wioth params.action upvote or downvote
  */
  updateRelatedResource: function(entity, resource, user, params, next) {
    var now = helpers.now();

    neo4j.query(queries.update_entity_related_resource, {
      entity_id: entity.id,
      resource_id: resource.id,
      user_id: user.id,
      exec_date: now.date,
      exec_time: now.time
    }, function (err, results) {
      if(err || !results.length) {
        next(err || helpers.IS_EMPTY);
        return;
      }

      var result = results[0];

      if(!!~['upvote', 'downvote'].indexOf(params.action)) {
        if(params.action == 'upvote') {
          result.rel.properties.upvote = _.unique((result.rel.properties.upvote || []).concat(user.username));
          if(result.rel.properties.downvote && !!~result.rel.properties.downvote.indexOf(user.username)) {
            result.rel.properties.downvote = _.remove(result.rel.properties.downvote, user.username);
          }

          // 1. upvote the entity
          
        }

        if(params.action == 'downvote') {
          result.rel.properties.downvote = _.unique((result.rel.properties.downvote || []).concat(user.username));
          if(result.rel.properties.upvote && !!~result.rel.properties.upvote.indexOf(user.username)) {
            result.rel.properties.upvote =_.remove(result.rel.properties.upvote, user.username);
          }


        }
        
        result.rel.properties.celebrity =  _.compact(_.unique((result.rel.properties.upvote || []).concat(result.rel.properties.downvote|| []))).length;
        result.rel.properties.score = _.compact((result.rel.properties.upvote || [])).length - _.compact((result.rel.properties.downvote|| [])).length;
        
        async.series({
          relationships: function (callback) {
            async.parallel({
              relationship: function(_callback) {
                neo4j.rel.update(result.rel, _callback);
              },
              action: function (_callback) {
                Action.create({
                  kind: params.action,
                  target: Action.APPEARS_IN_RELATIONSHIP,
                  mentions: [resource.id, entity.id],
                  username: user.username
                }, _callback);
              },
            }, callback);
          },
          resource: function (callback) {
            Resource.get({
              id: result.res.id
            }, callback)
          }
        }, function (err, results) {
          if(err)
            next(err);
          else
            next(null, {
              id: result.ent.id,
              type: result.ent.type,
              props: result.ent,
              related: {
                resource: results.resource,
                action: results.relationships.action
              },
              rel: result.rel.properties
            });
        });
      } else {
        // nothing special to do
        next(null, {
          id: result.ent.id,
          props: result.ent,
          rel: result.rel
        });
      }
    });
  },
  /*
    Remove the appears_in relationship (resource)--(entity)
    api
    @param entity   - entity.id should be an integer identifier
    @param resoruce - resource.id should be an integer identifier
    @param user     - user.id and user.username should exist
    @param params   - used only wioth params.action upvote or downvote
  */
  removeRelatedResource: function (entity, resource, user, params, next) {
    async.series({
      relationship: function (callback) {
         neo4j.query(queries.remove_entity_related_resource, {
          entity_id: entity.id,
          resource_id: resource.id,
          user_id: user.id,
          username: user.username,
        }, callback);
      },
      resource: function (callback) {
        Resource.get({
          id: resource.id
        }, callback)
      }
    }, function (err, results) {
      if(err)
        next(err);
      else
        next(null, {
          id: entity.id,
          related: {
            resource: results.resource,
          }
        });
    });
  },

  /*
    Useful api for downvoting/upvoting
    Note that You can modify the original one only if you're the owner of the comment.
  */
  update: function(id, params, next) {
    var now = helpers.now();
        // query = parser.agentBrown(queries.update_comment, properties);
    
    neo4j.query(queries.get_entity, {
      id: id
    }, function (err, ent) {
      if(err) {
        next(err);
        return;
      }
      if(!ent.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      ent = ent[0];
      
      if(params.upvoted_by) {
        ent.props.upvote = _.unique((ent.props.upvote || []).concat([params.upvoted_by]));
      }
      if(params.downvoted_by) {
        ent.props.downvote = _.unique((ent.props.downvote || []).concat([params.downvoted_by]));
      }
      ent.props.celebrity =  _.unique((ent.props.upvote || []).concat(ent.props.downvote|| [])).length;
      ent.props.score = (ent.props.upvote || []).length - (ent.props.downvote|| []).length;
      ent.props.last_modification_date = now.date;
      ent.props.last_modification_time = now.time;
      
      if(params.issue) {
        ent.props.issues = _.unique((ent.props.issues || []).concat([params.issue]));
      }
      
      // async.parallel({
      //   action: function(){

      //   },
      //   entity: function(){

      //   }
      // })
      neo4j.save(ent.props, function (err, props) {
        if(err) {
          next(err);
          return;
        }
        ent.props = props;
        next(null, ent);
      })
    })
  },

  
  
  
  /**
    Monopartite graph
    params must contain an integer ID
  */
  getRelatedEntitiesGraph: function(params, next) {
    var query = parser.agentBrown(queries.get_related_entities_graph, params)
    helpers.cypherGraph(query, params, function (err, graph) {
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
  getRelatedResourcesGraph: function(params, next) {
    var query = parser.agentBrown(queries.get_related_resources_graph, params)
    helpers.cypherGraph(query, params, function (err, graph) {
      if(err) {
        next(err);
        return
      };
      next(null, graph);
    });
  },
  /**
    Bipartite graph of entity and resources
  */
  getGraph: function (id, properties, next) {
    var options = _.merge({
      id: +id,
      limit: 500
    }, properties);
    
    
    neo4j.query(queries.get_graph, options, function (err, items) {
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
  /** check if the entity NAME actually correspond to the dbpedia lookup result of its links_wiki
  */
  inspect: function(id, properties, next) {
    var errors   = [],
        warnings = [];
       
    neo4j.read(id, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      
      var q = async.waterfall([
        // check if the entity has a proper wiki link
        function (nextTask) {
          if(!node.links_wiki || !node.links_wiki.length > 0) {
            warnings.push({
              need: 'it has not a links_wiki',
              cause: {
                notFound: node.name
              }
            });
            
            nextTask(null, node);
            return;
          }
          // download the first lookup
          helpers.lookupPerson(node.name, function (err, persons) {
            if(err == helpers.IS_EMPTY) {
              // wiki links is not dbpedia lookup (that is, has been manually set)
              nextTask();
              return;
            } else if(err) {
              next(err);
              return;
            }
            if(persons.length > 1) {
              crowdsourcing.personDisambiguate(node, persons, function (err, res) {
                if(err) {
                  next(err);
                  return;
                }
                errors.push({
                  need: 'disambiguate multiple dbpedia resources',
                  cause: {
                    tooManyResults: persons.length
                  }
                });
                nextTask();
              });
              
            } else if(persons[0].name != node.name) {
              crowdsourcing.personDisambiguate(node, persons, function (err, res) {
                if(err) {
                  next(err);
                  return;
                }
                errors.push({
                  need: 'verify dbpedia identity',
                  cause: {
                    nameDiffer: [persons[0].name, node.name]
                  }
                });
                nextTask();
              });
            } else if(persons[0].links_wiki != node.links_wiki) {
              crowdsourcing.personDisambiguate(node, persons, function (err, res) {
                if(err) {
                  next(err);
                  return;
                }
                errors.push({
                  need: 'verify dbpedia link',
                  cause: {
                    linkDiffer: [persons[0].links_wiki, node.links_wiki]
                  }
                });
                nextTask();
              });
            } else {
              nextTask();
            }
            // output a crowdsourcing activity: who is this person according to dbpedia?
          });
        }
      
      ], function() {
        next(null, node, errors, warnings);
      });
    })
  },
  /**
   discover()

   Enrich the entity by using dbpedia data (and yago).
   Since entities comes from Resource.discover activities, they're enriched with
   the properties coming with their dbpedia or yago link. It will then be possible
   to exstimqte better the adequancy of the entity to the context and rate the
   link...
   
   @param entity - object containing id property, the numeric internal Neo4J node identifier
   */
  enrich: function(entity, next) {
    // save point (commit)
    var savepoint = function (node, addons, callback) {
      console.log('    savepoint:', _.keys(addons));
      if(!_.isEmpty(addons)) {
        neo4j.save(_.assign({}, node, addons), function (err, node) {
          callback(err, node, {}); // clean addons
        })
      } else {
        console.log('    savepoint skipped, nothing to do');
        callback(null, node, {});
      }
    };

    async.waterfall([
      function getNode(callback) {
        neo4j.read(entity.id, callback);
      },

      function prepareAddons(node, callback) {
        console.log('    entity:', node.name, node.id);
        
        var addons = {};
        callback(null, node, addons);
      },
      /*
        If the dbpedia id is given, try to find other stuff, like viaf, birth_date and death_date etc..;
      */
      function getOtherIdentifiers(node, addons, callback) {
        if(_.isEmpty(node.links_wiki))
          callback(null, node, addons);
        else
          helpers.dbpediaPerson(node.links_wiki, function (err, wiki) {
            if(err == helpers.IS_EMPTY){
              callback(null, node, addons);
              return
            }
            if(err == helpers.IS_WRONG_TYPE) {
              console.log('    SIGNALED WRONG TYPE: it is wrong man');
              Issue.create({
                kind: Issue.TYPE,
                questioning: entity.id,
                user: {username: 'MARVIN-staff'}
              }, function(err, issue) {
                if(err)
                  callback(err);
                else
                  callback(null, node, addons);
              })
              return;
            }
            if(err){
              callback(err);
              return;
            }
            
            _.each(wiki, function(d,k) {
              if(_.isEmpty(node[k]) && !_.isEmpty(d))
                addons[k] = d
            });
            console.log(addons)
            
            callback(null, node, addons);
          })
      },

      savepoint,

      function getLinks(node, addons, callback) {
        if(_.isEmpty(node.links_viaf)) {
          callback(null, node, addons);
          return;
        }
        services.viaf.links({
          link: node.links_viaf
        }, function (err, viaf) {
          if(err) {
            callback(err);
            return;
          }
          if(viaf.WKP && _.isEmpty(node.links_wikidata))
            addons.links_wikidata = _.first(viaf.WKP)
          if(viaf.LC && _.isEmpty(node.links_lc))
            addons.links_lc = _.first(viaf.LC) // library of congress authority list
          if(viaf.ISNI && _.isEmpty(node.links_isni))
            addons.links_isni = _.first(viaf.ISNI)
          console.log(addons)
          callback(null, node, addons);
        })
      },

      // save if addons
      savepoint,
      /*
        Extract useful information from wikidata
      */
      function getWikidata(node, addons, callback) {
        if(_.isEmpty(node.links_wikidata)) {
          callback(null, node, addons);
          return;
        }
        // add language specific description from wikidata
        services.wikidata.entity({
          link: node.links_wikidata
        }, function (err, wiki) {
          if(err) {
            callback(err);
            return;
          }
          // take short description per dedicated languages 
          settings.languages.forEach(function(language) {
            
            if(wiki.descriptions[language] && !_.isEmpty(wiki.descriptions[language].value)) {
              
              if(_.isEmpty(node['wikidata_description_'+language]))
                addons['wikidata_description_'+language] = wiki.descriptions[language].value;
              
              if(_.isEmpty(node['description_'+language]))
                addons['description_'+language] =  wiki.descriptions[language].value;
            }
          });

          // get aliases (alternate variations)
          // automatic name_search
          if(wiki.aliases)
            addons.name_search = _.unique(
              _.map((node.name_search || '')
                .split(' || ')
                .concat(
                  _.map(
                    _.flatten(
                      _.values(wiki.aliases)
                    ),
                    'value'
                  )
                ), function(d){
                  return d.toLowerCase()
              })
            ).join(' || ')

          
          callback(null, node, addons);
        });        
      },

      savepoint

    ], next);
  },
  /*
    Propose merging two entities.
    (user)-[:suggest]->(merge)-[:mentions]->(from,to)
    
  */
  reconcile: function (from, to, user, params, next) {
    // mark the entities as mergeable. What is the most complete entity?
    // count the different relationships and check the various fields
    // neo4j.query(queries.)
  },
  
  model: function(item, options) {
    var d = {},
        keys = [
          'id',
          'name',
          'thumbnail',
          'languages',
          'description',
          'death_date',
          'birth_date',
          'death_time',
          'birth_time'
        ]
    // clone only some property from the original cypher item
    keys.forEach(function (key) {
      if(item[key])
        d[key] = item[key]
    });
    // deal with language
    if(!item.languages)
      return d;
    
    if(options.language && item.languages.indexOf(options.language) !== -1) {
      d.abstract = item['abstract_' + options.language];
    } else if(item.languages.length) {
      d.abstract = item['abstract_' + item.languages[0]];
    }
    return d
  },

  /*
    This method MUST NOT HAVE an API access.
    user can contain just the email field.
  */
  remove: function(entity, next) {
    neo4j.query(queries.remove_entity, entity, function (err, res) {
      if(err)
        next(err);
      else
        next(null);
    }) 
  },
};