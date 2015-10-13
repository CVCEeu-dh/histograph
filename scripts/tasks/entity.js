/*
  
  Resource task collection
*/
var settings  = require('../../settings'),
    parser    = require('../../parser'),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    Entity    = require('../../models/entity');

module.exports = {
  
  jaccard: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.entity.jaccard'));
    var queries = require('decypher')('./queries/playground.cyp'),
        query = parser.agentBrown(queries.jaccard, options);
    console.log(query);
    
    callback(null, options);
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
      options.fields = entity.FIELDS;
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