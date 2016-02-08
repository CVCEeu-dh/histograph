/*
  Export GEXF from cypher query.
  Use options
*/
'use-strict'

var settings  = require('../../settings'),
    neo4j     = require('seraph')(settings.neo4j.host),

        parser   = require('../../parser'),
    fs        = require('fs'),
    gexf      = require('gexf'),
    _         = require('lodash'),
    clc       = require('cli-color'),
    
    queries   = require('decypher')('./queries/tasks.gexf.cyp');


module.exports = {
  init: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.gexf.init'));
    options.gexf = gexf.create();
    callback(null, options);
  },
  /*
    Write records tuples as nodes and edges
  */
  stringify: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.gexf.stringify'));
    console.log(options.records.length)
    callback(null, options);
    var nodeIndex = {};

    for(var i = 0, l=options.records.length; i < l; i++) {
      if(!nodeIndex[options.records[i].source.id]) {
        options.gexf.addNode({
          id: String(options.records[i].source.id),
          label: options.records[i].source.label,
          viz: {
            color: 'rgb(255, 234, 45)'
          }
        });
        nodeIndex[options.records[i].source.id] = true;
      }

      if(!nodeIndex[options.records[i].target.id]) {
        options.gexf.addNode({
          id: String(options.records[i].target.id),
          label: options.records[i].target.label,
          viz: {
            color: 'rgb(255, 234, 45)'
          }
        });
        nodeIndex[options.records[i].target.id] = true;
      }

      options.gexf.addEdge({
        id: _.sortBy([options.records[i].target.id, options.records[i].source.id]).join('.'),
        source: String(options.records[i].source.id),
        target: String(options.records[i].target.id),
        viz: {
          thickness: +options.records[i].weight,
        }
      });
    }

    ;

    fs.writeFile(options.filepath, options.gexf.serialize(), function (err) {
      if(err) {
        callback(err);
        return
      }
      callback(null, options);
    })
  },


  cooccurrences: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.gexf.cooccurrences'));
  },

  entity: {
    /*
      entity to entity occurrence, by type
    */
    cooccurrences: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.gexf.bipartite'));

      if(_.isEmpty(options.entityA)) {
        return callback(' Please specify the type of entity for the A set with --entityA');
      }

      if(_.isEmpty(options.entityB)) {
        return callback(' Please specify the type of entity for the B set with --entityB');
      }

      for(var i in options){
        if(typeof options[i] != 'string')
          continue;
        var pseuroArray = options[i].match(/^\[([^\]]*)\]$/);
        console.log(options[i],'rrrrr', pseuroArray)
        if(!pseuroArray)
          continue;
        
        options[i] = _.map(pseuroArray[1].split(','), function(d) {
          if(isNaN(d))
            return d.trim();
          else
            return +d;
        });
      }

      var query = options.entityA == options.entityB? queries.get_entity_monopartite_graph: queries.get_entity_bipartite_graph,
          params = _.assign({ entity: options.entityA, limit: 10000, offset:0}, options);

      // count total amount?
      console.log('   ',options.entityA, 'vs', options.entityB, params);
     
      neo4j.query(parser.agentBrown(query, params), params, function(err, results) {
        if(err) {
          callback(err);
        } else {
          options.records = results;
          callback(null, options);
        }
      });
    }
  }
}