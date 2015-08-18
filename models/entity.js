

/**
 * Entity Model for Location, Organisation, etc...
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/entity.cyp'),
    parser    = require('../parser.js'),
    
    crowdsourcing = require('../crowdsourcing/entity.js'),
    clc       = require('cli-color'),
    async     = require('async'),
    _         = require('lodash');
    
    

module.exports = {
  /*
    Create a new entity or merge it if an entity with the same wikilink exists.
    Note that an entity must be linked to a document.
  */
  create: function(properties, next) {
    var now   = helpers.now(),
        props = {
          name: properties.name,
          links_wiki: _.isEmpty(properties.links_wiki)? undefined: properties.links_wiki,
          type: properties.type,
          creation_date: now.date,
          creation_time: now.time,
          trustworthiness: properties.trustworthiness || 0,
          resource_id: properties.resource.id
        },
        query = parser.agentBrown(queries.merge_entity, props);
        
    neo4j.query(query, props, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes[0]);
    })
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
  getRelatedResources: function(properties, next) {
    async.parallel({
      totalItems: function(callback) {
        neo4j.query(queries.count_related_resources,  {
          id: properties.id
        }, function (err, result) {
          if(err)
            callback(err);
          else
            callback(null, result.total_items);
        });
      },
      items: function(callback) {
        neo4j.query(queries.get_related_resources, {
          id: properties.id,
          limit: properties.limit,
          offset: properties.offset
        }, function (err, items) {
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
    Change the relationship status from resource to the entity.
    status: DISCARD
    
    
    Alternative:
    Downvote the link from the resource to the entity.
    If two users downvoted it, the relationship disappear?
  */
  signaleRelatedResource: function(entity, resource, next) {
    
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
       // -> { make: 'Citroen', model: 'DS4', id: 1 }
      if(params.upvoted_by) {
        ent.props.upvote = _.unique((ent.props.upvote || []).concat(params.upvoted_by));
      }
      if(params.downvoted_by) {
        ent.props.downvote = _.unique((ent.props.downvote || []).concat(params.downvoted_by));
      }
      ent.props.celebrity =  _.unique((ent.props.upvote || []).concat(ent.props.downvote|| [])).length;
      ent.props.score = (ent.props.upvote || []).length - (ent.props.downvote|| []).length;
      ent.props.last_modification_date = now.date;
      ent.props.last_modification_time = now.time;
      // user will follow the inquiry
      // upvote downvote with user username. (more readable)
      // score is changed relatively
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

  
  
  getRelatedPersons: function(id, properties, next) {
    var options = _.merge({
      id: +id,
      offset: 0,
      limit: 20
    }, properties);

    neo4j.query(queries.get_related_persons, options, function (err, items) {
      if(err) {
        next(err);
        return
      }

      next(null, items);
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
    // build a nodes edges graph
    helpers.cypherGraph(queries.get_graph_persons, options, function (err, graph) {
      if(err) {
        next(err);
        return
      }
      next(null, graph);
    })
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
   Enrich the entity by using dbpedia data (and yago).
   Since entities comes from Resource.discover activities, they're enriched with
   the properties coming with their dbpedia or yago link. It will then be possible
   to exstimqte better the adequancy of the entity to the context and rate the
   link...
   
   @param id - numeric internal Neo4J node identifier
   */
  discover: function(id, next) {
    neo4j.read(id, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      console.log('discover', _.keys(node))
      var q = async.waterfall([
        function lookupDBpediaLink (nextTask) { // check if the entity has a proper wiki link
          if((node.links_wiki && node.links_wiki.length > 0) || node.name.split(' ').length < 2) {
            nextTask(null, node);
            return
          }
          console.log('lookup person', node.name)
          helpers.lookupPerson(node.name, function (err, persons) {
            if(err) {
              console.log('error', err)
              nextTask(null, node)
              return;
            }
            if(persons.length > 1) {
              console.log(persons);
              throw err
              return;
            } 
            node = _.merge(node, persons[0]);
            if(node.services && node.services.length)
              node.services = _.unique(node.services);
            console.log(node, 'wikipedia')
            neo4j.save(node, function (err, res) {
              if(err) {
                console.log('error')
                next(err);
                return;
              }
              nextTask(null, node);
            })
          });
        },
        // download wiki data
        function (node, nextTask) {
          console.log(clc.blackBright('check wikipedia link'))
          
          if(!node.links_wiki || node.links_wiki.length == 0) {
            console.log(clc.blackBright('entity does not have a wiki link'),'skipping');
            nextTask(null, node)
            return
          };
          if(node.links_wiki.match(/[^a-zA-Z_\-'%0-9,\.]/g)) {
            node.links_wiki = encodeURIComponent(node.links_wiki);
            console.log('wiki link changed!', node.links_wiki)
          }
          console.log(clc.blackBright('following'), node.links_wiki)

          helpers.dbpediaPerson(node.links_wiki, function (err, res) {
            if(err) {
              console.log(clc.red('error'), err)
              nextTask(null, node)
              return;
            }
            
            // in order to avoid the neo4jerror on empty array.
            if(res.languages.length > 0) {
              node = _.merge(node, res);
            }
            if(res.first_name && res.last_name && res.first_name.trim().length && res.last_name.trim().length) {
              node.slug = node.slug || helpers.text.slugify(res.first_name + ' ' + res.last_name);
              console.log(clc.blackBright('slug', clc.yellowBright(node.slug)));
            }
            // console.log(node)
            // cleaning services
            // if(node.services && node.services.length)
            //   node.services = _.unique(node.services);
            neo4j.save(node, function(err, res) {
              if(err) {
                console.log(clc.red('error'), err.neo4jError.message)
                next(err);
                return;
              }
              nextTask(null, node);
            })
            
          });
        },
        // dbpedia lookup ... ? If it is more than 2 words.
        
        function (node, nextTask) {
          // console.log('viaf check', node.links_viaf)
          if(!node.links_viaf) {
            nextTask(null, node)
            return
          };
          
          helpers.viafPerson(node.links_viaf, function (err, res) {
            //console.log(res);
            nextTask(null, node)
          });
        }
      ], function(err) {
        next(null, node);
      });
    })
  },
  /*
    Do different entities poinjt to the same data? This function allow to merge them along with their links !! @todo
    links will contain hidden field about this transaction.
  */
  reconcile: function (from, to, next) {
    neo4j.query(queries.get_relationships, {
      id: from.id
    }, function (err, relationships) {
      if(err)
        return next(err);
      
      var q = async.queue(function (relationship, nextRelationship) {
        console.log(clc.blackBright('copy:',clc.yellowBright(relationship.start),'-[:', relationship.type,']->',clc.yellowBright(relationship.end)))
        var query = parser.agentBrown(queries.merge_relationships, {
          type: relationship.type
        });
        // console.log(query)
        neo4j.query(query, {
          id_start: to.id,
          id_end: relationship.end,
          reconciled_by: _.unique((relationship.reconciled_by||[]).concat(from.id))
        }, function (err, newRelationship) {
          if(err)
            throw err;
          newRelationship = newRelationship[0]
          console.log(clc.blackBright('  to:',clc.magentaBright(newRelationship.start),'-[:', newRelationship.type,']->',clc.yellowBright(newRelationship.end)))
          // delete relationship by id....(beware!!!)
          
          nextRelationship(); 
        })
      }, 1);
      q.push(relationships);
      q.drain = function(err) {
        if(err)
          next(err)
        else
          next()
      }
      // merge relationship, one by one!!
    })
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
  }
};