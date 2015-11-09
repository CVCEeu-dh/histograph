/*
  
  Setup js.
  Setup constraint, labels and everything else.
  
*/

var settings  = require('../../settings'),
    neo4j     = require('seraph')(settings.neo4j.host),
    async     = require('async'),
    _         = require('lodash'),
    clc       = require('cli-color'),
    queries   = require('decypher')('./queries/setup.cyp');

module.exports = {
  indexes: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.setup.indexes'));
      
    var q = async.queue(function (query, nextQuery) {
      console.log(clc.blackBright('...executing'), query.name)
      
      neo4j.query(query.cypher, function (err, result) {
        if(err)
          throw err;
        console.log(clc.greenBright('   done'),  q.length(), clc.blackBright('remaining\n'))
        nextQuery();
      })
    }, 1);

    q.push(_.map(queries, function (d, i) {
      return {
        cypher: d,
        name: i
      }
    }));

    q.drain = function() {
      callback(null, options);
    };
  },
  
}

