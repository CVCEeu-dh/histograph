/*
  Shared tasks for manage.js script
  npm manage --task=
*/
var fs         = require('fs'),
    csv        = require('csv');
    
    
module.exports = {
  /*
    Print out a csv file, to be used in a waterfall, with err.
    require as options
      filepath
      records
      fields
  */
  stringify: function(options, next) {
    csv.stringify(options.records, {
      delimiter: options.delimiter || '\t',
      columns:   options.fields,
      header:    true
    }, function (err, data) {
      fs.writeFile(options.filepath,
         data, function (err) {
        if(err) {
          next(err);
          return
        }
        next(null, options.filepath);
      })
    });
  }
};