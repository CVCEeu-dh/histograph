/*
  
  Resource task collection
*/
var settings = require('../../settings'),
    async    = require('async'),
    Resource = require('../../models/resource');

module.exports = {
  
  importData: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.importData'));
    // check that data model is correct enough. 
    // Cfr. queries/resource.cyp --> merge_resource query
    var COLUMNS    = [ // mandatory column names
        'slug',
        'languages',
        'title_en',
        'caption_en',
        'url',
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
    
    // get the total amount of languages from columns names starting with title_* 
    languages = _.compact(fields.map(function (d) {
      var field = d.match(/^title_([a-za-z]{2})$/);
      if(field)
        return field[1]
      return;
    }));
    
    // get the expected fields according to language
    expectedFields = _.unique(
      COLUMNS.concat(
        _.flatten(
          languages.map(function (language) {
            return _.flatten(settings.disambiguation.fields.concat(['url']).map(function (field) {
              return field + '_' + language;
            }));
          })
        )
      )
    );
    
    // get the difference between the mandatory column names and the current column names
    neededFields = _.difference(expectedFields, fields);
    if(neededFields.length > 0) {
      console.log('  missing: ',neededFields)
      callback('missing fields in your tsv file first line')
      return;
    }
    
    
    console.log(clc.blackBright('   everything looks good, saving', clc.magentaBright(options.data.length), 'resources'));
        
    var q = async.queue(function (resource, next) {
      resource.user = options.marvin;
      resource.languages = _.compact(_.map(resource.languages.split(','),_.trim)).sort()
      resource.name = resource.name || resource.title_en;
      console.log(clc.blackBright('   saving ...', clc.whiteBright(resource.slug)))
      Resource.create(resource, function (err, res) {
        if(err) {
          q.kill();
          callback(err)
        } else {
          console.log(clc.blackBright('   resource: ', clc.whiteBright(resource.slug), 'saved', q.length(), 'resources remaining'));
      
          next();
          
        }
      })
    }, 3);
    q.push(options.data);
    q.drain = function() {
      callback(null, options);
    }
  },
  exportData: function(options, callback) {
    console.log('export data')
    callback()
  }
}