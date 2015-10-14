/*
  
  Setup js.
  Setup constraint, labels and everything else.
  
*/

var settings  = require('../../settings'),
    neo4j     = require('seraph')(settings.neo4j.host),
    async     = require('async'),
    _         = require('lodash'),
    clc       = require('cli-color'),
    queries   = require('decypher')('./queries/suggest.cyp');


module.exports = {
  NODE_LEGACY_INDEXES : [
    'full_search',
    'title_search',
    'name_search'
  ],
  /*
    init legacy indexes for lucene:
  
    create three legacy indexes:
        title_search and full_search for (res:reource) nodes;
        name_search for (ent:entity) nodes.
  
  */
  init: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.lucene.init'));
    
    async.series(_.map(module.exports.NODE_LEGACY_INDEXES, function (legacyIndex) {
      return function (next) {
        console.log(clc.blackBright('   creating legacy index'), clc.cyanBright(legacyIndex));
        neo4j.node.legacyindex.create(legacyIndex, {
          type: 'fulltext',
          provider: 'lucene'
        }, function (err, results) {
          if(err) {
            next(err)
          } else {
            console.log(clc.blackBright('   index', clc.greenBright('created'), 'correctly'));
            next()
          }
            
        })
        
      }
    }), function(err) {
      if(err)
        callback(err);
      else {
        callback(null, options);
      }
    });
  },
  /*
    drop legacy indexes for lucene:
  
    delete three legacy indexes:
        title_search and full_search for (res:resource) nodes;
        name_search for (ent:entity) nodes.
  
  */
  drop: function(options, callback) {
    async.series(_.map(module.exports.NODE_LEGACY_INDEXES, function (legacyIndex) {
      return function (next) {
        console.log(clc.blackBright('   deleting legacy index'), clc.redBright(legacyIndex));
        neo4j.node.legacyindex.delete(legacyIndex, function (err, results) {
          if(err && err.neo4jError.exception == 'NotFoundException') {
            console.log(clc.blackBright('   index', clc.yellowBright('not found'), '- nothing to do, skipping...'));
            next();
          } else if(err) {
            next(err);
          } else {
            console.log(clc.blackBright('   index', clc.greenBright('deleted'), 'correctly'));
            next();
          }
        })
        
      }
    }), function (err) {
      if(err)
        callback(err);
      else {
        callback(null, options);
      }
    });
    
  },
  
  /*
    Update lucene index.
    
  */
  update: function(options, callback) {
    async.series(_.map(module.exports.NODE_LEGACY_INDEXES, function (legacyIndex) {
      return function (next) {
        console.log(clc.blackBright('   updating legacy index'), legacyIndex);
        neo4j.query(queries['build_'+ legacyIndex +'_legacy_index'], function (err) {
          if(err) {
            next(err);
          } else {
            console.log(clc.blackBright('   index', clc.greenBright('updated'), 'correctly'));
            next();
          }
        })
        
      }
    }), function (err) {
      if(err)
        callback(err);
      else {
        callback(null, options);
      }
    });
    
    
    
  }
}