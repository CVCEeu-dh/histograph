/*
  
  Resource task collection
*/
var settings = require('../../settings'),
    helpers = require('./helpers'),
    async    = require('async'),
    Resource = require('../../models/resource');

module.exports = {
  
  importData: function(options, callback) {
    console.log(' load data');
    console.log(options.data);
    
    // check that data model is correct enough. 
    var COLUMNS    = [ // columns that HAVE TO BE PRESENT IN THE SOURCE TSV FILE!!!!
        'slug',
        'languages',
        'start_date',
        'end_date',
        'viaf_id'
      ],
      
      languages,
      fields,
      expectedFields,
      neededFields;
      
    // get the fields from the very first line  
    fields = _.keys(_.first(options.data));
    
    languages = _.compact(fields.map(function (d) {
      var field = d.match(/^title_([a-za-z]{2})$/);
      if(field)
        return field[1]
      return;
    }));
    
    // expected fields according to language
    expectedFields = _.unique(COLUMNS.concat(_.flatten(languages.map(function (language) {
      return _.flatten(settings.disambiguation.fields.map(function (field) {
        return field + '_' + language;
      }));
    }))));
    
    neededFields = _.difference(expectedFields, fields);
    if(neededFields.length > 0) {
      console.log('  missing: ',neededFields)
      callback('missing fields in your tsv file first line')
      return;
    }
    
    // create or merge admin username
    
    
    var q = async.queue(function (resource, next) {
      Resource.create(resource, function(err) {
        if(err) {
          q.kill();
          callback(err)
        } else {
          next();
        }
      })
    }, 3);
    q.push(options.data);
    q.drain = callback;
  },
  exportData: function(options, callback) {
    console.log('export data')
    callback()
  }
}