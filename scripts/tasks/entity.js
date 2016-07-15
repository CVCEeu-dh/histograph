/*
  
  Resource task collection
*/
var settings  = require('../../settings'),
    _ = require('lodash'),
    YAML = require('yamljs'),
    parser    = require('../../parser'),
    helpers    = require('../../helpers'),
    inquirer     = require('inquirer'),
    neo4j     = require('seraph')(settings.neo4j.host),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    Entity    = require('../../models/entity'),
    Resource  = require('../../models/resource'),
    
    queries   = require('decypher')('./queries/similarity.cyp');

var task = {
  /*
    get couples of entities having the same id.
    Call it before
  */
  getClustersByWiki: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.getClustersByWiki'));
    neo4j.query('MATCH (ent:entity) WHERE has(ent.links_wiki) AND ent.links_wiki <> ""  WITH ent.links_wiki as links_wiki, collect({id: id(ent), label: last(labels(ent)), df: ent.df}) as entities WITH links_wiki, entities, length(entities) as c WHERE c > 1 RETURN  links_wiki, entities ORDER by c DESC', function (err, clusters) {
      if(err) {
        callback(err)
        return;
      }
      options.clusters = clusters;
      console.log(clc.blackBright('    collected', clc.magentaBright(clusters.length), 'clusters'));
      callback(null, options);
    })
  },
  /*
    Perform a complete merge based on a series of options.clusters
    Each cluster should display an entitites list where entities ids can be found.
    
    The annotation themselves will be changed according to the new data.
    Handle with care
  
  */
  mergeMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.mergeMany'));
    
    var q = async.queue(function (cluster, nextCluster) {
      console.log('    cluster:', clc.cyanBright(cluster.links_wiki));
      var ids = _.map(cluster.entities, 'id'),
          the_id = _(cluster.entities)
            .filter('df')
            .sortBy(['df'],['desc']);
          console.log(the_id.value().length)
          the_id = the_id
            .first()
            .get('id');// _.get(_.first(_.orderBy(_.filter(cluster.entities, 'df'), ['df'],['desc'])), 'id'),// index with most df will take all
          labels = _.unique(_.map(cluster.entities, 'label'));
      console.log(clc.blackBright('    most important id:', clc.cyanBright(the_id)))
      if(!ids || ids.length == 0) {
        q.kill()
        callback('ids should be a valid array of ints') ;
        return;
      }
      throw 'stop'
      // for each cluster
      async.waterfall([
        /*
          1) get versions, that is transform annotation to match the new id
        */
        function getAnnotations(next) {
          neo4j.query('MATCH (s:entity)-[:appears_in]->(r:resource)<-[:describes]-(a:annotation {service:{service}}) WHERE id(s) in {ids} RETURN DISTINCT a as annotation', {
            ids: ids,
            service: 'ner'
          },next);
        },

        function remapAnnotations(annotations, next) {
          console.log(clc.blackBright('    annotations:'), clc.magentaBright(annotations.length));
          
          var skipped = 0;
          var _q = async.queue(function(annotation, nextAnnotation) {
           
            var hasChanged = false,
                ann = _.map(parser.yaml(annotation.yaml), function (d) {
              if(ids.indexOf(d.id) !== -1 && d.id != the_id) {
                console.log(d.id, 'found', 'in', ids)
                 console.log(d)
                  d.id = the_id;
                hasChanged = true;
                
              }
              return d;
            });

            if(!hasChanged) {
              skipped++;
              setTimeout(nextAnnotation, 10);
              return
            } else {
              
              // save the committed version, then link the previous vesion to this new object and unlink
              // clone it
              // detach resource link
              async.waterfall([
                /*
                  Redeem frequency count based on the given annotation.
                */
                function redeemFrequency(_next) {
                  _next();
                },
                function detatch(_next) {
                  console.log(clc.blackBright('detach previous version...'))
                  neo4j.query('MATCH (ann:annotation)-[r:describes]->(res:resource) WHERE id(ann) = {annotation_id} AND id(res) = {resource_id} WITH ann, r, res SET ann.service="version" DELETE r', {
                    annotation_id: annotation.id,
                    resource_id: annotation.resource
                  }, _next)
                },

                function attach(result, _next) {
                  console.log(clc.blackBright('    attach merged version...'));
                  Resource.createRelatedVersion({
                    id: annotation.resource
                  }, {
                    language: annotation.language,
                    service: annotation.service,
                    yaml: YAML.stringify(ann)
                  }, _next);
                },
                function link(result, _next) {
                  console.log(clc.blackBright('    create relationship', clc.magentaBright(annotation.id), '-[:is_version_of]->', clc.greenBright(result.id)));
                  neo4j.query('MATCH (ann:annotation), (ann2:annotation) WHERE id(ann) = {prev_annotation_id} AND id(ann2) = {annotation_id} MERGE (ann)-[:is_version_of]->(ann2) RETURN ann, ann2', {
                    prev_annotation_id: annotation.id,
                    annotation_id: result.id
                  }, _next)
                }
              ], function (err) {
                if(err){
                  q.kill();
                  next(err);
                } else {
                  console.log(clc.blackBright('    merging annotation', clc.greenBright('completed'), 'remaining', q.length()));
                  nextAnnotation()
                }
              });

              // {
              //   language: language,
              //   service: 'ner',
              //   yaml: YAML.stringify(d, 2)
              // }

            }
              


          }, 1);

          _q.push(_.filter(annotations, 'yaml'));
          _q.drain = function(){

              console.log(clc.blackBright('    skipped', clc.yellowBright(skipped), 'annotations, nothing needed to be changed'));
            next();
          }
        },

        /*
          2) get relationships
        */
        function getRelationships(next) {
          

          console.log(clc.blackBright('    get [:appears_in] rels from entities:',  clc.cyanBright(JSON.stringify(ids))));
            
          neo4j.query('MATCH (s:entity) WHERE id(s) in {ids} WITH s MATCH (s)-[r]-(t) WHERE NOT id(t)  in {ids} WITH r RETURN r', {
            ids: ids
          }, next);
        },

        function cloneRelationships(rels, next) {
          console.log(clc.blackBright('    found', clc.magentaBright(rels.length), 'relationships'));
          
          var ghosts = rels.map(function (rel) {
            if(ids.indexOf(rel.start) != -1 && rel.start != the_id) {
              console.log(clc.blackBright('      replace', clc.redBright(rel.start), ' with ', clc.cyanBright(the_id), '-->'), rel.end);
              rel.new_start  = the_id;
              rel.new_end = rel.end
              rel.CHANGE = true; 
            } else if(ids.indexOf(rel.end) != -1 && rel.end != the_id) {
              console.log(clc.blackBright('      replace', clc.redBright(rel.end), ' with ', clc.cyanBright(the_id), '<--'), rel.start);
              rel.new_start  =  rel.start;
              rel.new_end = the_id
              rel.CHANGE = true; 
            }
            return rel;
          });
          
          var clones = _.values(_.groupBy(ghosts, function(d) { // everything except the ID
            return [d.start, d.end, d.type, JSON.stringify(d.properties)].join();
          }));
          
          var relToBeRemoved = _.flatten(clones.filter(function (d) {
            return d.length > 1;
          }).map(function (d) {
            return _.takeRight(_.map(d, 'id'), d.length -1);
          }));
          
          var relToBeUpdated = _.flatten(clones.map(function(d) {
            return _.first(d, 1);
          })).filter(function (d) {
            return d.CHANGE
          });
          
          console.log(clc.blackBright('    remove relationships:'), relToBeRemoved.length)
          console.log(clc.blackBright('    update relationships:'), relToBeUpdated.length)
          if(relToBeUpdated.length + relToBeRemoved.length == 0) {
            console.log(clc.blackBright('   nothing to do, skipping', clc.cyanBright(JSON.stringify(ids))));
            next();
            return;
          };
          
          inquirer.prompt([{
            type: 'confirm',
            name: 'YN',
            message: ' Press enter to MERGE or REMOVE the selected relationships, otherwise SKIP by typing "n"',
          }], function (answers) {
            // Use user feedback for... whatever!! 
            if(answers.YN) {
              async.series([
                function removeClonedRelationships(_next) {
                  var removeQueue = async.queue(function (rel, nextRelationship) {
                    console.log(clc.blackBright('   relationship to remove'), rel);
                    // remove cloned relationships
                    // var queueRemoveRelationship = async.queue
                    neo4j.query('MATCH (ins)-[r]-(t) WHERE id(ins) in {ids} AND id(r) = {id} DELETE r', {
                      ids: ids,
                      id: rel
                    }, function (err) {
                      if(err) {
                        updateQueue.kill();
                        _next(err);
                      } else {
                        console.log(clc.greenBright('   relationship removed'));
                        nextRelationship();
                      }
                    });
                  }, 1);
                  removeQueue.push(relToBeRemoved);
                  removeQueue.drain = _next;
                },

                function updateChangedRelationships(_next) {
                  var updateQueue = async.queue(function (rel, nextRelationship) {
                    console.log(clc.blackBright('   relationship to update'), rel);
                    
                    var query = parser.agentBrown(
                      ' MATCH (s) WHERE id(s)={new_start} ' + 
                      '   WITH s MATCH (t) WHERE id(t)={new_end} ' +
                      '   WITH s,t MATCH ()-[r]-() WHERE id(r)={id}'+
                      ' MERGE (s)-[rc:{:type}]->(t) '+
                      ' ON CREATE SET rc = r '+
                      ' ON MATCH SET rc=r WITH r DELETE r', rel
                    );
                    
                    neo4j.query(query,rel, function (err) {
                      if(err) {
                        updateQueue.kill();
                        _next(err);
                      } else {
                        console.log(clc.greenBright('   relationship updated'));
                        nextRelationship();
                      }
                    });
                  }, 1);
                  updateQueue.push(relToBeUpdated);
                  updateQueue.drain = _next;
                }
              ], function (err) {
                if(err) {
                  q.kill();
                  next(err);
                } else {
                  console.log(clc.greenBright('   merged successfully'));
                  next();
                }
              });
            } else {
              console.log(clc.blackBright('   skipped, nothing changed for', clc.cyanBright(JSON.stringify(ids))));
              next();
              return;
            }
          }); // eof inquirer.prompt
          
        }
      // remove orphelins
      // function cleanup(next) {
      //   console.log(clc.blackBright('\n   cleaning orphelins'));
      //   neo4j.query('MATCH (ins:institution) WHERE NOT (ins)-[]-() DELETE ins', next);
      // },
      ], function (err, results) { //eof async.series
        if(err) {
          q.kill();

          callback(err)
        } else
          nextCluster()
      });
    }, 1);
    q.drain = function(){
      callback(null, options);
    }
    q.push(options.clusters)
  },
  /*
    Get the chunks where you can find an entity.
    Based on annotation!
  */
  chunks: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.chunks'));
    
    // get the resources where each entitty is present, along with its annotation
    var q = async.queue(function (entity, nextEntity) {
      console.log(clc.blackBright('\n   entity: '), entity.id, clc.cyanBright(entity.name.substring(0, 24)));
      
      neo4j.query('MATCH (ann:annotation{service:{service},language:{language}})-[rel_a_r:describes]->(res:resource)<-[rel_e_r:appears_in]-(ent) WHERE id(ent) = {id} AND has(ann.language) RETURN {rel_a_r: rel_a_r, rel_e_r: rel_e_r, res: res, ann: ann } ORDER BY id(ent) LIMIT 100', {
        id: entity.id,
        service: 'ner',
        language: 'en'
      }, function (err, paths) {
        if(err) {
          q.kill();
          callback(err);
          return;
        }
        if(paths.length == 0) {
          console.log(clc.blackBright('   skipping...'))
          nextEntity();  
          return;
        }
        // console.log(paths.length)
        
        var qp = async.queue(function (path, nextPath) {
          console.log(clc.blackBright('\n     resource: '), path.res.id, clc.cyanBright(path.res.slug.substring(0, 24)), paths.length - qp.length(), '/', paths.length);
          console.log(path.ann.language)
          // get from the yaml the chunks of texts
          console.log(Resource.getAnnotatedText(path.res, path.ann, {
            with: [57798]
          }))
          // console.log('ttt', path.ann)
          // nextPath();
        }, 1);
        
        qp.push(paths);
        qp.drain = nextEntity;  
      })
      
    }, 1);
    q.push(options.records);
    q.drain = function() {
      callback(null, options);
    };
  },
  
  cleanSimilarity: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.cleanSimilarity'));
    
    /*
      Count relationships to be cleaned
    */
    var loops = 0,
        limit = 500,
        total = 0;

    neo4j.query(queries.count_appear_in_same_document, function (err, results){
      if(err) {
        callback(err);
        return;
      }
      console.log(results);
      total = results[0].total_count;
      loops = Math.ceil(total / limit);
      console.log('    loops needed:', loops,'- total:',total);

      async.timesSeries(loops, function (n, _next) {
        console.log('    loop:', n ,'- offset:', n*limit, '- limit:', limit, '- total:', total)
        neo4j.query(queries.clear_appear_in_same_document, {
          limit: limit
        }, _next);
      }, function (err) {
        if(err)
          callback(err);
        else
          callback(null, options)
      });

    });


    // async.series([
    //   function (next) {
        
    //   },

    // ])
    // neo4j.query(queries.clear_appear_in_same_document, function (err) {
    //   if(err)
    //     callback(err)
    //   else {
    //     console.log(clc.cyanBright('   cleaned'),'every similarity relationship');
    //     callback(null, options);
    
    //   }
    // })
  },
  
  prepare_resource_tfidf_variables: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.prepare_resource_tfidf_variables'));
    neo4j.query(queries.prepare_resource_tfidf_variables, function(err, results) {
      if(err)
        console.log(err)
      callback(null, options)
    });
  },

  prepare_entity_tfidf_variables: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.prepare_entity_tfidf_variables'));
    neo4j.query(queries.prepare_entity_tfidf_variables, function(err, results) {
      if(err)
        console.log(err)
      callback(null, options)
    });
  },

  tfidf: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.tfidf'));
    var loops = 0,
        total = 0,
        limit= isNaN(options.limit)? 5000: options.limit;

    neo4j.query(queries.count_appears_in, function(err, results) {
      if(err) {
        callback(err);
        return;
      }
      total = results[0].total_count;
      loops = Math.ceil(total / limit);
      console.log('    loops needed:', loops,'- total:',total, '- limit:', limit);

      var query = parser.agentBrown(queries.computate_tfidf, options);

      async.timesSeries(loops, function (n, _next) {
        console.log('    loop:', n ,'/', loops)
        neo4j.query(query, {
              offset: n*limit,
              limit: limit
            }, _next);

      }, function (err) {
        callback(err, options);
      });
    });
    
  },
  
  jaccard: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.jaccard'));
    async.waterfall([
      // count expected combinations
      function countExpected (next) {
        console.log('   count expected for entity label: ', options.entity)
        neo4j.query(parser.agentBrown(queries.count_entities, options), next)
      },
      // repeat n time to oid java mem heap space
      function performJaccard (result, next) {
        console.log(result)
        var limit = 100,
            total = result[0].total_count,
            loops = Math.ceil(total / limit);
        
        async.timesSeries(loops, function (n, _next) {
          console.log('    loop:', n ,'- offset:', n*limit, '- limit:', limit, '- total:', total, '(loops:', loops,')')
          var query = parser.agentBrown(queries.computate_jaccard_distance, options);
          neo4j.query(query, _.assign(options, {
            offset: n*limit,
            limit: limit
          }), _next);
          
        }, next);
      }
    ], function (err) {
      if(err) {
        callback(err)
      } else {
        console.log(clc.cyanBright('   created'),'jaccard indexes');
        callback(null, options);
      }
    });
  },
  
  cosine: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.cosine'));
    var query = parser.agentBrown(queries.computate_cosine_similarity, options);
    neo4j.query(query, function (err) {
      if(err)
        callback(err)
      else {
        console.log(clc.cyanBright('   created'),'cosine indexes');
        callback(null, options);
    
      }
    })
  },
  
  getMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.getMany'), options);
    var query = parser.agentBrown(
      ' MATCH (ent:entity{if:entity}:{:entity}{/if})-[:appears_in]->(r:resource) WITH DISTINCT ent\n'+
      ' SKIP {offset} LIMIT {limit} RETURN ent', options);
    console.log(query);
    neo4j.query(query, {
      limit: +options.limit || 100000,
      offset: +options.offset || 0
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(clc.blackBright('   nodes:', clc.magentaBright(nodes.length)));
      options.fields = Entity.FIELDS;
      options.records = nodes;
      callback(null, options);
    })
  },
  
  getOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.getOne'),'id:', options.id);
    neo4j.query(
      ' MATCH (ent:entity)\n'+
      ' WHERE id(ent)={id} RETURN ent LIMIT 1', {
      id: (+options.id || -1)
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(clc.blackBright('   nodes:', clc.magentaBright(nodes.length)));
      options.fields = Resource.FIELDS;
      options.records = nodes;
      callback(null, options)
      
    })
  },
  
  enrich: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.discover'));
    var q;

    q = async.queue(function (node, nextNode) {
      console.log(clc.blackBright('    entities remaining:', clc.white.bgMagenta(q.length()), '- done:'), clc.white.bgMagenta(options.records.length - q.length() ) );
          
      Entity.enrich({
        id: node.id
      }, function (err, n) {
        if(err) {
          q.kill();
          callback(err);
          return;
        }
        console.log('    node', n.id, '/', n.name,'/', clc.cyanBright('enriched'))
        console.log(clc.blackBright('    waiting for the next entity ... remaining:', clc.white.bgMagenta(q.length())))
        nextNode();
      });
    }, 1);
    q.push(options.records);
    q.drain = function() {
      callback(null, options);
    };
  },
  /*
    Start the discover chain for one signle dicoument, useful for test purposes.
  */
  discoverOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.discoverOne'));
    if(!options.id || isNaN(options.id)) {
      callback('option --id required')
      return;
    }
    var neo4j    = require('seraph')(settings.neo4j.host);
    var queue = async.waterfall([
      // get pictures and documents having a caption
      function (next) {
        neo4j.read(options.id, function (err, node) {
          if(err) {
            next(err);
            return;
          }
          next(null, node);
        });
      },
      /**
        Nicely add YAGO/TEXTRAZOR api service to extract persons from resources having caption (an/or source field)
      */
      function (node, next) {
        Entity.discover({
          id: node.id
        }, function (err, res) {
          if(err) {
            next(err);
            return
          }
          next
        })
      }
    ], function (err) {
      if(err)
        callback(err);
      else
        callback(null, options);
    });
  },

  slugify: function(options, callback){
    console.log(clc.yellowBright('\n   tasks.entity.slugify'));
    var q = async.queue(function(entity, nextEntity){
      if(entity.slug && entity.slug.length){
        console.log(clc.magentaBright('skipping ent'), entity.name, entity.slug)
        nextEntity();
      } else {
        entity.slug = helpers.text.slugify(entity.name);
        console.log(entity.name, ' -> ', entity.slug)
        neo4j.save(entity, function(err, node){
          if(err){
            q.kill();
            callback(err);
            return
          }
          nextEntity();
        });
      }
    }, 1);
    q.push(options.records);
    q.drain = function(){
      callback(null, options)
    }
  },




};

module.exports = _.defaults({
  tfidf:[
    task.prepare_resource_tfidf_variables,
    task.prepare_entity_tfidf_variables,
    task.tfidf
  ],
  slugify: [
    task.getMany,
    task.slugify
  ],
  set_entity_cooccurrences:[
    task.cleanSimilarity,
    function(options,callback){
      options.entity = 'person';
      callback(null, options);
    },
    task.jaccard,
    function(options,callback){
      options.entity = 'theme';
      callback(null, options);
    },
    task.jaccard
  ]
}, task);