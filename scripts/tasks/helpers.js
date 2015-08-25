/*
  Shared tasks for manage.js script
  npm manage --task=
*/
var fs         = require('fs'),
    csv        = require('csv'),
    generator  = require('../../generator')();
    
    
module.exports = {
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
          callback(null, options.filepath);
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
};