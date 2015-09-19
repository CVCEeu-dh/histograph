/*
  Shared tasks for manage.js script
  npm manage --task=
*/
var settings  = require('../../settings'),

    fs         = require('fs'),
    csv        = require('csv'),
    generator  = require('../../generator')();
    exectimer  = require('exectimer');
    
module.exports = {
  
  tick: {
    start: function(options, callback) {
      options.__tick = new exectimer.Tick("TIMER");
      console.log(clc.yellowBright('\n   tasks.helpers.tick.start'));
      options.__tick.start()
      callback(null, options)
    },
    end: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.tick.end'));
      options.__tick.stop();
      console.log(clc.yellowBright("It took: "), exectimer.timers.TIMER.duration()/1000000000);
      callback(null, options)
    }
  },
  
  marvin: {
    create: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.marvin.create'));
      
      var User = require('../../models/user');
      User.remove(generator.user.marvin(), function (err) {
        if(err)
          callback(err);
        else {
          console.log(clc.blackBright('   generating user'), clc.magentaBright('MARVIN'));
          User.create(generator.user.marvin(), function (err, user) {
            if(err)
              callback(err)
            else {
              console.log(clc.blackBright('   user', clc.magentaBright('MARVIN'), 'generated'));
          
              callback(null, _.assign(options, {
                marvin: user
              }));
            }
          });
        }
      });
    },
    remove: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.marvin.remove'));
      var User = require('../../models/user');
      console.log(clc.blackBright('   removing user'), clc.magentaBright('MARVIN'));
          
      User.remove(generator.user.marvin(), function (err) {
        if(err)
          callback(err);
        else
          callback(null, options);
      });
    }
  },
  /*
    Print out a csv file, to be used in a waterfall, with err.
    require as options
      filepath
      records
      fields
  */
  csv: {
    stringify: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.csv.stringify'));
      csv.stringify(options.records, {
        delimiter: options.delimiter || '\t',
        columns:   options.fields,
        header:    true
      }, function (err, data) {
        fs.writeFile(options.filepath,
           data, function (err) {
          if(err) {
            callback(err);
            return
          }
          callback(null, options);
        })
      });
    },
    /*
      REQUIRE an absolute or relative to this file task
    */
    parse: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.csv.parse'));
      if(!options.source) {
        return callback(' Please specify the file path with --source=path/to/source.tsv');
      }
      csv.parse(''+fs.readFileSync(options.source), {
        columns : true,
        delimiter: options.delimiter || '\t'
      }, function (err, data) {
        if(err) {
          callback(err);
          return;
        }
        console.log(clc.blackBright('   parsing csv file completed,', clc.magentaBright(data.length), 'records found'));
        options.data = data;
        callback(null, options);
      });
    }
  },
  
  cypher: {
    raw: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.cypher.raw'));
      if(!options.cypher) {
        return callback(' Please specify the query path (decypher file without .cyp extension followed by / query name), e.g. --cypher=resource/count_related_users');
      }
      
      var path = options.cypher.split('/');
      
      if(path.length != 2) {
        return callback(' Please specify a valid query path, e.g. --cypher=resource/count_related_users, since you specified ' + options.cypher);
      }
        
      
      var neo4j     = require('seraph')(settings.neo4j.host),
          queries   = require('decypher')('./queries/' + path[0] + '.cyp'),
          parser    = require('../../parser.js'),
          query;
      
      if(!queries[path[1]]) {
        console.log(clc.blackBright('  queries available:'), _.keys(queries));
        return callback(' Please specify a valid query name with --name=<queryname>');
      
      }
      
      console.log(clc.blackBright('   executing query: ', clc.magentaBright(options.cypher), '...\n'));
      
      
      query = parser.agentBrown(queries[path[1]], options);
      console.log(query)
      
      
      neo4j.query(query, options, function (err, result) {
        console.log(clc.blackBright('\n   result: \n'));
        if(err)
          console.log(err);
        else
          console.log(result);
        
      callback(null, options);
      })
      
    }
    
  }
};