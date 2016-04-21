/*
  common tasks
*/
var settings   = require('../../settings'),

    clc        = require('cli-color'),
    exectimer  = require('exectimer');
    
module.exports = {

  tick: {
    start: function(options, callback) {
      options.verbose = (options.verbose == undefined) ? true : options.verbose;
      options.__tick = new exectimer.Tick("TIMER");
      if (options.verbose) {
        console.log(clc.yellowBright('\n   tasks.helpers.tick.start'));
      }
      options.__tick.start()
      callback(null, options)
    },
    end: function(options, callback) {
      options.__tick.stop();
      if (options.verbose) {
        console.log(clc.yellowBright('\n   tasks.helpers.tick.end'));
        console.log(clc.yellowBright("   elapsed: "), exectimer.timers.TIMER.duration()/1000000000, clc.yellowBright("sec."));
      }
      options.timer =  exectimer.timers.TIMER;
      callback(null, options);
    }
  },

  cypher: {
    query: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.common.cypher.query'));
      if(!options.cypher) {
        return callback(' Please specify the query path (decypher file without .cyp extension followed by / query name), e.g. --cypher=resource/count_related_users');
      }
      
      var path = options.cypher.split('/');
      
      if(path.length != 2) {
        return callback(' Please specify a valid query path, e.g. --cypher=resource/count_related_users, since you specified ' + options.cypher);
      }
        
      
      var neo4j     = require('seraph')(settings.neo4j.host),
          queries   = require('decypher')('./queries/' + path[0] + '.cyp'),
          parser    = require('../../helpers/parser'),
          query;
      
      if(!queries[path[1]]) {
        console.log(clc.blackBright('  queries available:'), _.keys(queries));
        return callback(' Please specify a valid query name with --name=<queryname>');
      }
      
      // autotransform stringified array in array
      // e.g. --mimetype=[image,text]
      // is transforemd into options.mimetype = ['image', 'text']
      for(var i in options){
        if(typeof options[i] != 'string')
          continue;
        var arr = options[i].match(/^\[([^\]]*)\]$/);
        // console.log(options[i],'rrrrr', arr)
        if(!arr)
          continue;
        
        options[i] = _.map(arr[1].split(','), function(d) {
          if(isNaN(d))
            return d.trim();
          else
            return parseInt(d);
        });
      }
      
      console.log(clc.blackBright('   executing query: ', clc.magentaBright(options.cypher), '...\n'));
      
      // enrich options with timestamp (always useful though)
      if(!options.exec_time || !options.exec_date){
        var now = require('../../helpers/utils').now();
        options.exec_time = now.time;
        options.exec_date = now.date;
      }


      
      query = (options.profile? 'PROFILE ':'') + parser.agentBrown(queries[path[1]], options);
      console.log(query)
      
      console.log('with params')
      console.log(options)
      
      neo4j.query(query, options, function (err, result) {
        console.log(clc.blackBright('\n   result: \n'));
        if(err)
          console.log(err);
        else
          console.log(result);
        
      callback(null, options);
      })
      
    },
  }
}