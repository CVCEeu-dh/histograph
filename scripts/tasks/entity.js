/*
  
  Resource task collection
*/
var settings  = require('../../settings'),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    Entity  = require('../../models/entity');

module.exports = {
  
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