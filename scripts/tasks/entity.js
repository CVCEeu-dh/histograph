/*
  
  Resource task collection
*/
var settings  = require('../../settings'),
    parser    = require('../../parser'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    Entity    = require('../../models/entity'),
    Resource  = require('../../models/resource'),
    
    queries   = require('decypher')('./queries/similarity.cyp');

module.exports = {
  
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
    neo4j.query(queries.clear_appear_in_same_document, function (err) {
      if(err)
        callback(err)
      else {
        console.log(clc.cyanBright('   cleaned'),'every similarity relationship');
        callback(null, options);
    
      }
    })
  },
  
  tfidf: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.tfidf'));
    var query = parser.agentBrown(queries.computate_tfidf, options);
    neo4j.query(query, function (err) {
      if(err)
        callback(err)
      else {
        console.log(clc.cyanBright('   created'),'tfidf properties');
        callback(null, options);
    
      }
    })
  },
  
  jaccard: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.jaccard'));
    var query = parser.agentBrown(queries.computate_jaccard_distance, options);
    neo4j.query(query, function (err) {
      if(err)
        callback(err)
      else {
        console.log(clc.cyanBright('   created'),'jaccard indexes');
        callback(null, options);
    
      }
    })
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
    console.log(clc.yellowBright('\n   tasks.entity.getMany'));
    var query = parser.agentBrown(
      ' MATCH (ent:entity{if:entity}:{:entity}{/if})\n'+
      ' RETURN ent SKIP {offset} LIMIT {limit}', options);
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
  
  discoverMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.discover'));
    
    var neo4j    = require('seraph')(settings.neo4j.host);
    var queue = async.waterfall([
      // get pictures and documents having a caption
      function (next) {
        neo4j.query('MATCH (a:resource) WHERE NOT (a)-[:appears_in]-() RETURN a ORDER BY a.mimetype DESC skip {offset} LIMIT {limit} ', {
          limit: +options.limit || 10,
          offset: +options.offset || 0
        }, function (err, nodes) {
          if(err) {
            next(err);
            return;
          }
          next(null, nodes);
        });
      },
      /**
        Nicely add TEXTRAZOR api service to extract persons from resources having caption (an/or source field)
      */
      function (nodes, next) {
        var q = async.queue(function (node, nextNode) {
          console.log(clc.blackBright('resource remaining'), clc.white.bgMagenta(q.length()));
          
          Entity.discover({
            id: node.id
          }, function (err, res) {
            if(err)
              throw err;
            
            res.yago_annotated = true;
            neo4j.save(res, function (err, n) {
              if(err)
                throw err;
              console.log('node', n.id, clc.cyanBright('saved'))
              console.log(clc.blackBright('waiting for the next resource ... remaining:', clc.white.bgMagenta(q.length())))
              setTimeout(nextNode, 1675);
            })
            
          });
        }, 1);
        q.push(nodes);
        q.drain = next;
      }
    ], function (err) {
      if(err)
        callback(err);
      else
        callback(null, options);
    });
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
  }
}